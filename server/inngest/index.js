import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "project-management" });

const userPayload = (data) => ({
    id: data.id,
    email: data?.email_addresses?.[0]?.email_address,
    name: `${data?.first_name ?? ""} ${data?.last_name ?? ""}`.trim(),
    image: data?.image_url ?? "",
});

// Upsert so retries / missed create events don't fail
const syncUserCreation = inngest.createFunction(
    { id: "sync-user-from-clerk", triggers: [{ event: "clerk/user.created" }] },
    async ({ event }) => {
        const data = userPayload(event.data);
        await prisma.user.upsert({
            where: { id: data.id },
            create: data,
            update: {
                email: data.email,
                name: data.name,
                image: data.image,
            },
        });
    }
);

// deleteMany does not throw when the user row is already gone
const syncUserDeletion = inngest.createFunction(
    { id: "delete-user-with-clerk", triggers: [{ event: "clerk/user.deleted" }] },
    async ({ event }) => {
        const { data } = event;
        await prisma.user.deleteMany({
            where: { id: data.id },
        });
    }
);

// Upsert so user.updated works even if user.created never ran
const syncUserUpdation = inngest.createFunction(
    { id: "update-user-from-clerk", triggers: [{ event: "clerk/user.updated" }] },
    async ({ event }) => {
        const data = userPayload(event.data);
        await prisma.user.upsert({
            where: { id: data.id },
            create: data,
            update: {
                email: data.email,
                name: data.name,
                image: data.image,
            },
        });
    }
);

export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation,
];
