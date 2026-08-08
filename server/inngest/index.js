import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "project-management" });

//ingest function to create user data in database
const syncUserCreation=inngest.createFunction(
    {id:'sync-user-from-clerk', triggers: [{event:'clerk/user.created'}]},
    async({event})=>{
        const{data}=event;
        await prisma.user.create({
            data:{
                id:data.id,
                email:data?.email_addresses[0]?.email_addres,
                name:data?.first_name+" "+data?.last_name,
                image:data?.image_url,
            }
        })
    }
)

//user funtion to delete user data from database
const syncUserDeletion=inngest.createFunction(
    {id:'delete-user-with-clerk', triggers: [{event:'clerk/user.deleted'}]},
    async({event})=>{
        const{data}=event;
        await prisma.user.delete({
            where:{
                id:data.id,
            }
        })
    }
)

//update
const syncUserUpdation=inngest.createFunction(
    {id:'update-user-from-clerk', triggers: [{event:'clerk/user.updated'}]},
    async({event})=>{
        const{data}=event;
        await prisma.user.update({
            where:{
                id:data.id,
            },
            data:{
                email:data?.email_addresses[0]?.email_addres,
                name:data?.first_name+" "+data?.last_name,
                image:data?.image_url,
            }
        })
    }
)

// Create an empty array where we'll export future Inngest functions
export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation
];