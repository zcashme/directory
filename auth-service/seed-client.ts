import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding pgpz client into the database...");
  
  await prisma.zcashOidcClient.upsert({
    where: { id: "pgpz" },
    update: {}, // Do nothing if it already exists
    create: {
      id: "pgpz",
      name: "PGPZ Community",
      payload: {
        client_id: "pgpz",
        client_name: "PGPZ Community",
        redirect_uris: [
          "https://community.pgpforcrypto.org/api/auth/callback/zcashme",
          "http://localhost:3000/api/auth/callback/zcashme",
        ],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none", // PKCE only
      }
    }
  });

  console.log("Success! pgpz client is now registered in zm_auth_clients.");
}

main()
  .catch(e => console.error("Error seeding client:", e))
  .finally(() => prisma.$disconnect());
