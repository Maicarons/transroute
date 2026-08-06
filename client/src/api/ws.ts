// WebSocket 客户端（§8.1）：鉴权 / 加入世界 / 心跳，接收 welcome / snapshot / delta / pong / error。
// 使用 reconnecting-websocket 自动重连。

import ReconnectingWebSocket from 'reconnecting-websocket'
import type { WelcomeMsg, SnapshotMsg, DeltaMsg } from './types'

export type ServerMessage = WelcomeMsg | SnapshotMsg | DeltaMsg

export class WorldSocket {
  private ws: ReconnectingWebSocket | null = null
  private token: string
  private worldId: string

  onMessage: (msg: ServerMessage) => void = () => {}
  onStatus: (connected: boolean) => void = () => {}

  constructor(token: string, worldId: string) {
    this.token = token
    this.worldId = worldId
  }

  connect(): void {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const url = `${proto}://${location.host}/ws?token=${encodeURIComponent(
      this.token,
    )}&worldId=${encodeURIComponent(this.worldId)}`
    const ws = new ReconnectingWebSocket(url)
    ws.onopen = () => this.onStatus(true)
    ws.onclose = () => this.onStatus(false)
    ws.onmessage = (ev: MessageEvent) => {
      try {
        const msg = JSON.parse(ev.data as string)
        this.onMessage(msg)
      } catch {
        // 忽略非法消息
      }
    }
    this.ws = ws
  }

  send(obj: unknown): void {
    this.ws?.send(JSON.stringify(obj))
  }

  ping(): void {
    this.send({ type: 'ping' })
  }

  close(): void {
    this.ws?.close()
    this.ws = null
  }
}
