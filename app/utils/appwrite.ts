import { Account, Client, Databases } from "appwrite";

function getAppwrite(config: { public: { appwriteEndpoint: string; appwriteProjectId: string } }) {
  const client = new Client()
    .setEndpoint(config.public.appwriteEndpoint)
    .setProject(config.public.appwriteProjectId);

  const account = new Account(client);
  const databases = new Databases(client);

  return { client, account, databases };
}

export function useAppwrite() {
  return getAppwrite(useRuntimeConfig());
}
