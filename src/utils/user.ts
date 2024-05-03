import { Address } from '@graphprotocol/graph-ts'

import { User } from '../types/schema'

export function ensureUser(userAddress: Address): User {
  let user = User.load(userAddress)
  if (!user) {
    user = new User(userAddress)
    user.save()
  }

  return user
}
