import { Address, BigInt } from '@graphprotocol/graph-ts'

import { ERC721Metadata as ERC721MetadataContract } from '../types/RafflFactory/ERC721Metadata'
import { Raffl as RaflContract } from '../types/RafflFactory/Raffl'
import {
  FeeCollectorChange as FeeCollectorChangeEvent,
  GlobalCreationFeeChange as GlobalCreationFeeChangeEvent,
  GlobalPoolFeeChange as GlobalPoolFeeChangeEvent,
  CustomCreationFeeChange as CustomCreationFeeChangeEvent,
  CustomCreationFeeToggle as CustomCreationFeeToggleEvent,
  CustomPoolFeeChange as CustomPoolFeeChangeEvent,
  CustomPoolFeeToggle as CustomPoolFeeToggleEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  OwnershipTransferRequested as OwnershipTransferRequestedEvent,
  RaffleCreated as RaffleCreatedEvent,
} from '../types/RafflFactory/RafflFactory'
import {
  FeeCollectorChange,
  GlobalCreationFeeChange,
  GlobalPoolFeeChange,
  CustomCreationFeeChange,
  CustomCreationFeeToggle,
  CustomPoolFeeChange,
  CustomPoolFeeToggle,
  OwnershipTransferred,
  OwnershipTransferRequested,
  Prize,
  Raffle,
  RaffleCreated,
} from '../types/schema'
import { Raffl as NewRaffl } from '../types/templates'
import { ensureAsset } from '../utils/asset'
import { setTokenGate } from '../utils/token-gate'
import { ensureUser } from '../utils/user'

export function handleFeeCollectorChange(event: FeeCollectorChangeEvent): void {
  const entity = new FeeCollectorChange(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.feeCollector = event.params.feeCollector

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleGlobalCreationFeeChange(event: GlobalCreationFeeChangeEvent): void {
  const entity = new GlobalCreationFeeChange(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.newValue = event.params.creationFeeValue
  entity.validSince = event.block.timestamp.plus(BigInt.fromI32(3600))
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleGlobalPoolFeeChange(event: GlobalPoolFeeChangeEvent): void {
  const entity = new GlobalPoolFeeChange(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.newValue = event.params.poolFeePercentage
  entity.validSince = event.block.timestamp.plus(BigInt.fromI32(3600))
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function handleCustomCreationFeeChange(event: CustomCreationFeeChangeEvent): void {
  const entity = new CustomCreationFeeChange(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.newValue = event.params.creationFeeValue
  entity.user = event.params.user
  entity.validSince = event.block.timestamp.plus(BigInt.fromI32(3600))
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function handleCustomCreationFeeToggle(event: CustomCreationFeeToggleEvent): void {
  const entity = new CustomCreationFeeToggle(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.newState = event.params.enable
  entity.user = event.params.user
  entity.validSince = event.block.timestamp.plus(BigInt.fromI32(3600))
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function handleCustomPoolFeeChange(event: CustomPoolFeeChangeEvent): void {
  const entity = new CustomPoolFeeChange(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.newValue = event.params.poolFeePercentage
  entity.user = event.params.user
  entity.validSince = event.block.timestamp.plus(BigInt.fromI32(3600))
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function handleCustomPoolFeeToggle(event: CustomPoolFeeToggleEvent): void {
  const entity = new CustomPoolFeeToggle(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.newState = event.params.enable
  entity.user = event.params.user
  entity.validSince = event.block.timestamp.plus(BigInt.fromI32(3600))
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function handleOwnershipTransferRequested(event: OwnershipTransferRequestedEvent): void {
  const entity = new OwnershipTransferRequested(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.previousOwner = event.params.from
  entity.newOwner = event.params.to

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {
  const entity = new OwnershipTransferred(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.previousOwner = event.params.from
  entity.newOwner = event.params.to

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRaffleCreated(event: RaffleCreatedEvent): void {
  // Creation event entity
  const creationEntity = new RaffleCreated(event.transaction.hash.concatI32(event.logIndex.toI32()))

  creationEntity.blockNumber = event.block.number
  creationEntity.blockTimestamp = event.block.timestamp
  creationEntity.transactionHash = event.transaction.hash

  creationEntity.save()

  // Create Raffle entity
  const raffleContract = RaflContract.bind(event.params.raffle)
  const raffle = new Raffle(event.params.raffle)
  raffle.entryPrice = raffleContract.entryPrice()
  raffle.minEntries = raffleContract.minEntries()
  raffle.creator = ensureUser(event.transaction.from).id
  raffle.participantsCount = 0
  raffle.entriesCount = 0
  raffle.deadline = raffleContract.deadline()
  raffle.status = raffleContract.gameStatus()
  raffle.creation = creationEntity.id
  raffle.tags = ''
  raffle.inception = event.block.timestamp
  raffle.save()

  // Ensure Entry token (if defined)
  const entryTokenAddress = raffleContract.entryToken()
  if (entryTokenAddress.notEqual(Address.zero())) {
    const entryToken = ensureAsset(raffleContract.entryToken(), 0)
    if (entryToken !== null) {
      raffle.entryToken = entryToken.id
    }
  }

  // Create Prizes
  let prizesCount = 0
  let finished = false
  while (!finished) {
    const prizesCall = raffleContract.try_prizes(BigInt.fromI32(prizesCount))
    if (prizesCall.reverted) {
      finished = true
    } else {
      const prizeEntity = new Prize(`${raffle.id.toHexString()}/prizes/${prizesCount}`)
      const foundPrizeAddress = prizesCall.value.getAsset()
      const foundPrizeType = prizesCall.value.getAssetType()
      const asset = ensureAsset(foundPrizeAddress, foundPrizeType)
      prizeEntity.raffle = raffle.id
      prizeEntity.asset = asset.id
      prizeEntity.value = prizesCall.value.getValue()
      if (foundPrizeType === 1) {
        const erc721Contract = ERC721MetadataContract.bind(foundPrizeAddress)
        prizeEntity.uri = erc721Contract.tokenURI(prizeEntity.value)
      }
      raffle.tags = raffle.tags + ' ' + asset.name + ' ' + asset.symbol

      prizeEntity.save()
      prizesCount++
    }
  }
  raffle.tags = raffle.tags.trim()
  raffle.save()

  // Ensure token gating
  setTokenGate(event.params.raffle)

  // Listen for the created Raffl events
  NewRaffl.create(event.params.raffle)
}
