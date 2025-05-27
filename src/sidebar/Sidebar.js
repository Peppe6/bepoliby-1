import React from 'react';
import './Sidebar.css';
import ChatBubbleIcon from "@mui/icons-material/Chat";
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FilterTiltShiftIcon from '@mui/icons-material/FilterTiltShift';
import SearchIcon from '@mui/icons-material/Search';
import{ Avatar, IconButton} from "@mui/material"
import SidebarChat from './SidebarChat';

function Sidebar() {
    return(
        <div className="sidebar">
            <div className="sidebar_header">
                <div className="sidebar_header_left">
                  <IconButton>
                    <Avatar src='https://assets.gazzettadelsud.it/2019/01/Adrian-4.jpeg'></Avatar>   
                    </IconButton>
                </div>
             <div className="sidebar_header_right">
               
                <IconButton>
                <FilterTiltShiftIcon></FilterTiltShiftIcon>
                </IconButton>
                  <IconButton>
                <ChatBubbleIcon></ChatBubbleIcon>
                </IconButton>
                  <IconButton>
                <MoreVertIcon></MoreVertIcon>
                </IconButton>
             </div>
            </div>
            <div className= "sidebar_search">
              <div className="sidebar_search_container" >
                <SearchIcon></SearchIcon>
               <input type="text"  placeholder='Cerca o inizia una nuova chat'></input>
              </div>

            </div>
            <div>
            <div className='sibear_chat'></div>
           <SidebarChat />
           <SidebarChat />
           <SidebarChat />
           <SidebarChat />
           
           
            </div>
        </div>
    );
}

export default Sidebar; 