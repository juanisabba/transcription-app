# Despliegue

## Producción

El despliegue a producción se realiza automáticamente desde GitHub Actions al hacer push a `main`. **No se recomienda desplegar prod desde local** porque las variables de `.env.local` pueden sobrescribir configuración crítica (tablas DynamoDB, Cognito).

### Re-deploy manual (para corregir permisos IAM o variables)

Si la API devuelve 500 por permisos IAM o variables de entorno incorrectas:

```bash
cd api
pnpm exec serverless deploy --stage prod
```

**Requisitos:**
- Credenciales AWS configuradas (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- No tener `api/.env.local` cargado que pueda inyectar valores de dev (o el deploy usará las variables excluidas del plugin dotenv)

### Verificación post-deploy

1. En AWS Console → IAM → Roles, revisar `vocali-api-prod-eu-north-1-lambdaRole`:
   - Debe incluir `cognito-idp:AdminConfirmSignUp` sobre el User Pool del stack
   - Debe incluir `dynamodb:UpdateItem` sobre `vocali-users-prod`
2. En Lambda → vocali-api-prod-register → Configuration → Environment variables:
   - `DYNAMODB_USERS_TABLE` debe ser `vocali-users-prod`
   - `COGNITO_AUTO_CONFIRM` debe ser `false` en prod
