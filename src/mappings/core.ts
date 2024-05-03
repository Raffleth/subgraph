import { ensureUser } from '../utils/user'

import {
  DeadlineFailedCriteria,
  DeadlineSuccessCriteria,
  Draw,
  DrawSuccess,
  EntriesBought,
  EntriesRefunded,
  Entry,
  PrizesRefunded,
  Raffle,
  RaffleInitialized,
  RaffleParticipation
} from '../types/schema'
import {
  DeadlineFailedCriteria as DeadlineFailedCriteriaEvent,
  DeadlineSuccessCriteria as DeadlineSuccessCriteriaEvent,
  DrawSuccess as DrawSuccessEvent,
  EntriesBought as EntriesBoughtEvent,
  EntriesRefunded as EntriesRefundedEvent,
  PrizesRefunded as PrizesRefundedEvent,
  RaffleInitialized as RaffleInitializedEvent
} from '../types/templates/Raffl/Raffl'

enum GameState {
  Initialized,
  FailedDraw,
  DrawStarted,
  SuccessDraw
}

export function handleDeadlineFailedCriteria(event: DeadlineFailedCriteriaEvent): void {
  const raffle = Raffle.load(event.address)
  if (raffle) {
    const entity = new DeadlineFailedCriteria(event.transaction.hash.concatI32(event.logIndex.toI32()))
    entity.raffle = raffle.id
    entity.entries = event.params.entries
    entity.minEntries = event.params.minEntries

    entity.blockNumber = event.block.number
    entity.blockTimestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash

    entity.save()

    raffle.status = GameState.FailedDraw
    raffle.save()
  }
}

export function handleDeadlineSuccessCriteria(event: DeadlineSuccessCriteriaEvent): void {
  const raffle = Raffle.load(event.address)
  if (raffle) {
    const entity = new DeadlineSuccessCriteria(event.transaction.hash.concatI32(event.logIndex.toI32()))
    entity.raffle = raffle.id
    entity.requestId = event.params.requestId
    entity.entries = event.params.entries
    entity.minEntries = event.params.minEntries

    entity.blockNumber = event.block.number
    entity.blockTimestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash

    entity.save()

    raffle.status = GameState.DrawStarted
    raffle.save()
  }
}

export function handleDrawSuccess(event: DrawSuccessEvent): void {
  const raffle = Raffle.load(event.address)
  if (raffle) {
    const drawSuccessEntity = new DrawSuccess(event.transaction.hash.concatI32(event.logIndex.toI32()))
    drawSuccessEntity.raffle = raffle.id
    drawSuccessEntity.requestId = event.params.requestId
    drawSuccessEntity.winnerEntry = event.params.winnerEntry
    drawSuccessEntity.user = event.params.user
    drawSuccessEntity.entries = event.params.entries

    drawSuccessEntity.blockNumber = event.block.number
    drawSuccessEntity.blockTimestamp = event.block.timestamp
    drawSuccessEntity.transactionHash = event.transaction.hash

    drawSuccessEntity.save()

    raffle.status = GameState.SuccessDraw
    raffle.save()

    const draw = new Draw(event.transaction.hash.concatI32(event.logIndex.toI32()))
    draw.raffle = raffle.id
    draw.winner = ensureUser(event.params.user).id
    draw.drawSuccess = drawSuccessEntity.id
    draw.save()
  }
}

export function handleEntriesBought(event: EntriesBoughtEvent): void {
  const raffle = Raffle.load(event.address)
  if (raffle) {
    const entity = new EntriesBought(event.transaction.hash.concatI32(event.logIndex.toI32()))
    entity.raffle = raffle.id
    entity.entriesBought = event.params.entriesBought
    entity.value = event.params.value

    entity.blockNumber = event.block.number
    entity.blockTimestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash

    entity.save()

    // Entry entity
    const entryEntity = new Entry(event.transaction.hash.concatI32(event.logIndex.toI32()))
    entryEntity.raffle = event.address
    entryEntity.quantity = event.params.entriesBought
    entryEntity.total = event.params.value
    entryEntity.boughtEvent = entity.id

    // User entity
    const user = ensureUser(event.transaction.from)
    // RaffleParticipation
    const raffleParticipationId = raffle.id.concat(user.id)
    let raffleParticipationEntity = RaffleParticipation.load(raffleParticipationId)
    if (!raffleParticipationEntity) {
      raffleParticipationEntity = new RaffleParticipation(raffleParticipationId)
      raffleParticipationEntity.user = user.id
      raffleParticipationEntity.raffle = raffle.id
      raffleParticipationEntity.blockTimestamp = event.block.timestamp
    }
    raffleParticipationEntity.entries += event.params.entriesBought.toI32()
    raffleParticipationEntity.save()
    raffle.participantsCount++
    raffle.entriesCount += event.params.entriesBought.toI32()
    raffle.save()

    entryEntity.user = user.id
    entryEntity.save()
  }
}

export function handleEntriesRefunded(event: EntriesRefundedEvent): void {
  const raffle = Raffle.load(event.address)
  if (raffle) {
    const entity = new EntriesRefunded(event.transaction.hash.concatI32(event.logIndex.toI32()))
    entity.raffle = raffle.id
    entity.entriesRefunded = event.params.entriesRefunded
    entity.value = event.params.value
    entity.user = event.params.user

    entity.blockNumber = event.block.number
    entity.blockTimestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash

    entity.save()
  }
}

export function handlePrizesRefunded(event: PrizesRefundedEvent): void {
  const raffle = Raffle.load(event.address)
  if (raffle) {
    const entity = new PrizesRefunded(event.transaction.hash.concatI32(event.logIndex.toI32()))
    entity.raffle = raffle.id
    entity.user = raffle.creator
    entity.blockNumber = event.block.number
    entity.blockTimestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash

    entity.save()
  }
}

export function handleRaffleInitialized(event: RaffleInitializedEvent): void {
  const entity = new RaffleInitialized(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
