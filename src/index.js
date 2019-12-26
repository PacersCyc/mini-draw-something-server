import path from 'path'
import http from 'http'
import Koa from 'koa'

const PORT = 9001
const app = new Koa()
const server = http.createServer(app.callback())


server.listen(PORT, () => {
  console.log(`server start on ${PORT}`)
})