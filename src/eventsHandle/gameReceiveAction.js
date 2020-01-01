export default function gameReceiveActionHandle(data, socket) {
  // console.log(data)
  let socketRoom = Object.keys(socket.rooms)[1]

  switch (data.type) {
    case "start":
    case 'move':
      let sendData = {
        type: data.type,
        data: data.data,
        setting: data.setting
      }
      socket.broadcast.to(socketRoom).emit('drawAction', sendData)
    // io.to(socketRoom).emit('drawAction', sendData)
    default:
      break;
  }
}