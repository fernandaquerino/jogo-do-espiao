import { Module } from '@nestjs/common'
import { RoomGateway } from './gateway/room.gateway.ts'
import { HealthController } from './health.controller.ts'
import { InMemoryRoomStore, ROOM_STORE } from './rooms/room-store.ts'
import { RoomService } from './rooms/room.service.ts'

@Module({
  controllers: [HealthController],
  providers: [{ provide: ROOM_STORE, useClass: InMemoryRoomStore }, RoomService, RoomGateway],
})
export class AppModule {}
