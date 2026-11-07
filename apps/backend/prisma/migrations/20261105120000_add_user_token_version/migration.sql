-- Session revocation: JWTs carry tokenVersion; bumping it invalidates old tokens.
ALTER TABLE "users" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;
