 import React from 'react'
import {InsertEmoticon} from "@mui/icons-material"
import "./Chat.css" ;
import { Avatar, IconButton } from '@mui/material';
 function Chat () {
    return(
      <div className='Chat'>
        <div className='Chat_header'>
      <Avatar></Avatar>
        <div className='Chat_header_info'>
          <h3> Chat Name</h3>
          <p> Visto l'ultima...</p>
        </div>
        </div>
        <div className='Chat_body'>
          <p className='Chat_message'>
           <span className='Chat_name' >MIO NOME</span>
           Messaggio
           <span className='Chat_timestamp'>{new Date().toUTCString()}</span>
          </p>
             <p className='Chat_message Chat_receiver'>
           <span className='Chat_name' >MIO NOME</span>
           Messaggio
           <span className='Chat_timestamp'>{new Date().toUTCString()}</span>
          </p>
             <p className='Chat_message'>
           <span className='Chat_name' >MIO NOME</span>
           Messaggio
           <span className='Chat_timestamp'>{new Date().toUTCString()}</span>
          </p>
        </div>
        <div className='Chat_footer'>
          <IconButton>
            <InsertEmoticon></InsertEmoticon>
          </IconButton>
          <form>
          <input placeholder="Scrivi un messaggio..." type="text"></input>
        <button type="submit">Invia un Messaggio</button>
          </form>

         
        </div>
      </div>
    ) ;
 }

        
            
           

export default Chat;