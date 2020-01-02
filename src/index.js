import http from 'http'
import Koa from 'koa'
import socketIo from 'socket.io'
import connectHandle from './connectHandle'

const PORT = 9000
const app = new Koa()
const server = http.createServer(app.callback())
const io = socketIo(server)

// socket 房间id
let count = 0

// 在线玩家
let onlineUsers = {}
// 在线人数
let onlineCount = 0

let roomData = {}

let gameData = {}

let baseInfo = {
  onlineUsers,
  roomData,
  gameData,
  onlineCount
}

io.on('connect', socket => {
  connectHandle(socket, baseInfo, io, count)
})

server.listen(PORT, () => {
  console.log(`server start on ${PORT}`)
})