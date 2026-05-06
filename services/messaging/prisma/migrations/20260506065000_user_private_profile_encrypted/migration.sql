CREATE TABLE "UserPrivateProfile" (
    "userId" UUID NOT NULL,
    "emailEnc" BYTEA,
    "phoneEnc" BYTEA,
    "dekWrapped" BYTEA NOT NULL,
    "keyVersion" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPrivateProfile_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "UserPrivateProfile"
ADD CONSTRAINT "UserPrivateProfile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
