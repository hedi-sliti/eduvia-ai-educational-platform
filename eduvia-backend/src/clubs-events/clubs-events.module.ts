import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Club, ClubSchema } from './schemas/club.schema';
import { Event, EventSchema } from './schemas/event.schema';
import { ClubsEventsController } from './clubs-events.controller';
import { ClubsEventsService } from './clubs-events.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Club.name, schema: ClubSchema },
      { name: Event.name, schema: EventSchema },
    ]),
  ],
  controllers: [ClubsEventsController],
  providers: [ClubsEventsService],
  exports: [ClubsEventsService],
})
export class ClubsEventsModule {}
