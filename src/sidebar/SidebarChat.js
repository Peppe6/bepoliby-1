import React from "react";
import"./SidebarChat.css";
import { Avatar } from "@mui/material";


function SidebarChat(){
     return (
        <div className="sidebarChat">
            <Avatar></Avatar>
            <div className="sidebarChat_info">
                <h2>Name</h2>
                <p>Message</p>
            </div>
     
        </div>

     )
}

export default SidebarChat 