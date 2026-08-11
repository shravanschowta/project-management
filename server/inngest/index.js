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

//inngest function to store workspace data to databse
const syncWorkspaceCreation=inngest.createFunction(
    {id:'sync-workspace-from-clerk'},
    {event:'clerk/organization-created'},
    async({event})=>{
        const {data}=event;
        await prisma.workspace.create({
            data:{
                id:data.id,
                name:data.name,
                slug:data.slug,
                ownerId:data.created_by,
                image_url:data.image_url,
            }
        })

        await prisma.workspaceMember.create({
            data:{
                userId:data.created_by,
                workspaceId:data.id,
                role:"ADMIN"
            }
        })
    }
)

//function to update workspace
const syncWorkspaceUpdation=inngest.createFunction(
    {id:'update-workspace-from-clerk'},
    {event:'clerk/organization.updated'},
    async({event})=>{
        const {data}=event;
        await prisma.workspace.update({
            where:{
                id:data.id
            },
            data:{
                name:data.name,
                slug:data.slug,
                image_url:data.image_url,
            }
        })
    }
)

//function to delete organization
const syncWorkspaceDeletion=inngest.createFunction(
    {id:'delete-workspace-from-clerk'},
    {event:'clerk/organization.deleted'},
    async({event})=>{
        const {data}=event;
        await prisma.workspace.delete({
            where:{
                id:data.id
            }
        })
    }
)

//function to save workspace member data to database
const syncWorkspaceMemberCreation=inngest.createFunction(
    {id:'sync-workspace-member-from-clerk'},
    {event:'clerk/organizationInvitation.accepted'},
    async({event})=>{
        const{data}=event;
        await prisma.workspaceMember.create({
            data:{
                userId:data.user_id,
                workspaceId:data.organization_id,
                role:string(data.roll_name).toUpperCase(),

            }
        })
    }
)

export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation,
    syncWorkspaceCreation,
    syncWorkspaceDeletion,
    syncWorkspaceUpdation,
    syncWorkspaceMemberCreation,

];
