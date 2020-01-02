export default function loginHandle(data, socket, onlineUsers) {
  // console.log(data)
  let clientId = socket.id
  // 防止重复登录覆盖房间信息
  if (onlineUsers[clientId] && onlineUsers[clientId].uid === data.uid) {
    return
  }
  onlineUsers[clientId] = {
    ...data,
    clientId,
    currentRoom: ''
  }
  // console.log(onlineUsers)
}