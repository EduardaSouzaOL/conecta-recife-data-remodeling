#!/usr/bin/env bash
# Publica a API no AWS Lambda com Function URL (HTTPS). Pode rodar de novo: atualiza o código sem mudar a URL.
# Uso: ./scripts/publicar-lambda.sh        (região: AWS_REGION, padrão us-east-1)
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REGIAO="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
FUNCAO="${FUNCAO:-conecta-api}"
PAPEL="${PAPEL:-conecta-api-role}"
ALIAS="live"
RUNTIME="${RUNTIME:-nodejs22.x}"
export AWS_REGION="$REGIAO" AWS_DEFAULT_REGION="$REGIAO" AWS_PAGER=""

CONTA="$(aws sts get-caller-identity --query Account --output text)"
echo "Conta $CONTA, região $REGIAO, função $FUNCAO"

"$RAIZ/scripts/empacotar.sh"
ZIP="$RAIZ/build/conecta-api.zip"

# 1. Papel de execução
if ! aws iam get-role --role-name "$PAPEL" >/dev/null 2>&1; then
  aws iam create-role --role-name "$PAPEL" \
    --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' \
    --tags Key=projeto,Value=hackats-conecta-recife >/dev/null
  aws iam attach-role-policy --role-name "$PAPEL" --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  echo "Papel criado. Aguardando propagação..."; sleep 12
fi
ARN_PAPEL="arn:aws:iam::$CONTA:role/$PAPEL"

# 2. Função
# Estado compartilhado entre instâncias (pedidos, consentimentos): objeto privado no S3.
BALDE="${BALDE_ESTADO:-conecta-api-estado-$CONTA}"
if ! aws s3api head-bucket --bucket "$BALDE" >/dev/null 2>&1; then
  aws s3api create-bucket --bucket "$BALDE" >/dev/null
  aws s3api put-public-access-block --bucket "$BALDE" \
    --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  aws s3api put-bucket-tagging --bucket "$BALDE" --tagging 'TagSet=[{Key=projeto,Value=hackats-conecta-recife}]'
fi
aws iam put-role-policy --role-name "$PAPEL" --policy-name estado-s3 --policy-document \
  "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"s3:GetObject\",\"s3:PutObject\"],\"Resource\":\"arn:aws:s3:::$BALDE/estado.json\"},{\"Effect\":\"Allow\",\"Action\":\"s3:ListBucket\",\"Resource\":\"arn:aws:s3:::$BALDE\"}]}"
AMBIENTE="Variables={BD_DIR=/var/task/bd,DATA_DIR=/tmp/data,EVENTOS_MAX=5000,ESTADO_S3=$BALDE/estado.json}"
if ! aws lambda get-function --function-name "$FUNCAO" >/dev/null 2>&1; then
  aws lambda create-function --function-name "$FUNCAO" --runtime "$RUNTIME" --role "$ARN_PAPEL" \
    --handler src/api/lambda.handler --zip-file "fileb://$ZIP" \
    --memory-size 2048 --timeout 30 --ephemeral-storage Size=1024 \
    --environment "$AMBIENTE" --tags projeto=hackats-conecta-recife >/dev/null
else
  aws lambda update-function-code --function-name "$FUNCAO" --zip-file "fileb://$ZIP" >/dev/null
fi
aws lambda wait function-updated-v2 --function-name "$FUNCAO"
aws lambda update-function-configuration --function-name "$FUNCAO" --memory-size 2048 --timeout 30 \
  --handler src/api/lambda.handler --environment "$AMBIENTE" >/dev/null
aws lambda wait function-updated-v2 --function-name "$FUNCAO"

# 3. Versão e alias
VERSAO="$(aws lambda publish-version --function-name "$FUNCAO" --query Version --output text)"
if aws lambda get-alias --function-name "$FUNCAO" --name "$ALIAS" >/dev/null 2>&1; then
  aws lambda update-alias --function-name "$FUNCAO" --name "$ALIAS" --function-version "$VERSAO" >/dev/null
else
  aws lambda create-alias --function-name "$FUNCAO" --name "$ALIAS" --function-version "$VERSAO" >/dev/null
fi
echo "Versão $VERSAO no alias $ALIAS"

# 4. Function URL pública (a mesma URL é mantida nas próximas publicações)
if ! aws lambda get-function-url-config --function-name "$FUNCAO" --qualifier "$ALIAS" >/dev/null 2>&1; then
  aws lambda create-function-url-config --function-name "$FUNCAO" --qualifier "$ALIAS" --auth-type NONE >/dev/null
  aws lambda add-permission --function-name "$FUNCAO" --qualifier "$ALIAS" --statement-id url-publica \
    --action lambda:InvokeFunctionUrl --principal '*' --function-url-auth-type NONE >/dev/null
  aws lambda add-permission --function-name "$FUNCAO" --qualifier "$ALIAS" --statement-id url-publica-invoke \
    --action lambda:InvokeFunction --principal '*' --invoked-via-function-url >/dev/null
fi

# 5. Concorrência provisionada 1 (evita cold start na demo); se a conta não permitir, segue sem.
if ! aws lambda put-provisioned-concurrency-config --function-name "$FUNCAO" --qualifier "$ALIAS" \
     --provisioned-concurrent-executions 1 >/dev/null 2>&1; then
  echo "AVISO: sem concorrência provisionada; a primeira chamada depois de ociosidade será mais lenta."
fi

URL="$(aws lambda get-function-url-config --function-name "$FUNCAO" --qualifier "$ALIAS" --query FunctionUrl --output text)"
echo "URL pública: ${URL%/}"
