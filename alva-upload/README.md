# Alva

Aplicativo web/PWA de banco digital, construído com React, TanStack Start, Vite, Nitro e Tailwind CSS.

## Rodar localmente

```bash
npm ci
cp .env.example .env.local
npm run typecheck
npm run build
npm run dev
```

Abra `http://localhost:8080`.

## Publicar no GitHub + Vercel

1. Crie um repositório no GitHub.
2. Envie todo o conteúdo deste diretório.
3. Importe o repositório no Vercel.
4. O `vercel.json` já define instalação e build.
5. Para o modo standalone/demo, mantenha `VITE_AUTH_ENABLED=false` e não configure `DATABASE_URL`.
6. Para autenticação e persistência multiusuário em produção, configure as variáveis descritas em `.env.example` no Vercel.

## Aplicativo no celular

O projeto já inclui manifest e recursos de PWA. Em um navegador compatível no Android, use a opção de instalar/adicionar à tela inicial.

## Segurança

Segredos e arquivos de ambiente não devem ser commitados. Use as Environment Variables do Vercel.
