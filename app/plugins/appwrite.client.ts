import { AppwriteException } from "appwrite";

// Pings the Appwrite backend once when the app is opened to verify the setup.
export default defineNuxtPlugin((nuxtApp) => {
  const { client } = useAppwrite();
  nuxtApp.provide("appwritePing", () => client.ping());

  client
    .ping()
    .then(() => console.info("[appwrite] ping ok"))
    .catch((err) =>
      console.warn(
        "[appwrite] ping failed:",
        err instanceof AppwriteException ? `${err.code} ${err.message}` : err,
      ),
    );
});
