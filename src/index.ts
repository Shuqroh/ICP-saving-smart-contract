import {
  $query,
  $update,
  Record,
  StableBTreeMap,
  match,
  Result,
  nat64,
  ic,
  Opt,
  float32,
  nat16,
  Principal,
} from "azle";
import { v4 as uuidv4 } from "uuid";

type Saving = Record<{
  id: string;
  owner: Principal;
  username: string;
  specifiedYear: nat16;
  amount: float32;
  noOfDays: nat16;
  createdAt: nat64;
  updatedAt: Opt<nat64>;
}>;

type SavingPayload = Record<{
  username: string;
  specifiedYear: nat16;
  amount: float32;
  noOfDays: nat16;
}>;

const savingsStorage = new StableBTreeMap<string, Saving>(0, 44, 1024);


/**
 * Function that allows users to create and store a Saving
 */
$update;
export function createSaving(payload: SavingPayload): Result<Saving, string> {
  const saving: Saving = {
    id: uuidv4(),
    owner: ic.caller(),
    createdAt: ic.time(),
    updatedAt: Opt.None,
    ...payload,
  };
  savingsStorage.insert(saving.id, saving);
  return Result.Ok(saving);
}
/**
 * Function that returns the Saving with a specific id.
 * Must be the owner of the Saving to view its state
 * 
 */
$query;
export function getSavingById(id: string): Result<Saving, string> {
  return match(savingsStorage.get(id), {
    Some: (saving) => {
      if (saving.owner.toString() === ic.caller().toString()) {
        return Result.Ok<Saving, string>(saving);
      }
      return Result.Err<Saving, string>("Unauthorized caller");
    },
    None: () => Result.Err<Saving, string>(`saving with id=${id} not found`),
  });
}

// Function that allows the owner of a Saving to delete the Saving
$update;
export function deleteSaving(id: string): Result<Saving, string> {
  return match(savingsStorage.get(id), {
    Some: (saving) => {
      // return an error if caller isn't the Saving's owner
      if (saving.owner.toString() !== ic.caller().toString()) {
        return Result.Err<Saving, string>("Unauthorized caller");
      }
      savingsStorage.remove(id);
      return Result.Ok<Saving, string>(saving);
    },
    None: () =>
      Result.Err<Saving, string>(`couldn't delete saving with id=${id}.`),
  });
}

// Function that allows the owner of a Saving to increase the amount stored in the Saving
$update;
export function fundSaving(id: string, amount: number): Result<Saving, string> {
  const saving = getSavingById(id);
  // check if a Saving with id was found
  if (saving.Ok) {
    // return an error if caller isn't the Saving's owner
    if (saving.Ok.owner.toString() !== ic.caller().toString()) {
      return Result.Err<Saving, string>("Unauthorized caller");
    }
    const updatedSaving = {
      ...saving.Ok,
      amount: saving.Ok.amount + amount, // add amount to the current amount of the Saving
    };

    savingsStorage.insert(updatedSaving.id, updatedSaving);
    // return the updated Saving
    return Result.Ok<Saving, string>(updatedSaving);
  }
  // return an error that a Saving with id wasn't found
  return Result.Err<Saving, string>(`saving with id=${id} not found.`);
}

// Function that allows the owner of a Saving to withdraw the amount stored
$update;
export function withdrawSaving(id: string): Result<Saving, string> {
  const saving = getSavingById(id);
  // check if a Saving with id was found
  if (saving.Ok) {
    // return an error if caller isn't the Saving's owner
    if (saving.Ok.owner.toString() !== ic.caller().toString()) {
      return Result.Err<Saving, string>("Unauthorized caller");
    }
    const updatedSaving = {
      ...saving.Ok,
      amount: 0, // set amount of the Saving to zero
    };

    savingsStorage.insert(updatedSaving.id, updatedSaving);
    // return the updated Saving
    return Result.Ok<Saving, string>(updatedSaving);
  }
  // return an error that a Saving with id wasn't found
  return Result.Err<Saving, string>(`saving with id=${id} not found.`);
}

// a workaround to make uuid package work with Azle
globalThis.crypto = {
  getRandomValues: () => {
    let array = new Uint8Array(32);

    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }

    return array;
  },
};
