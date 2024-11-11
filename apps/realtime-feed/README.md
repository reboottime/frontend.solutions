# README

realtime activity feed system,

- use setinterval to mock websocket
- listen event type
- group event by types/date/hours

## main idea

- intersect observer on loading more
- reset page after changing filter | search keyword
- listen to  event belongs to the setted filter


Review fields:

- State synchronization across multiple data sources
- Race condition handling
- Error boundary implementation
- Optimistic updates with rollback
- Performance optimization for large datasets
- Real-time update handling