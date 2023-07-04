import {
  $query,
  $update,
  Record,
  StableBTreeMap,
  Vec,
  match,
  Result,
  nat64,
  ic,
  Opt,
} from "azle";
import { v4 as uuidv4 } from "uuid";

type Saving = Record<{
  id: string;
  username: string;
  specifiedYear: number;
  amount: number;
  noOfDays: number;
  createdAt: nat64;
  updatedAt: Opt<nat64>;
}>;

type SavingPayload = Record<{
  username: string;
  specifiedYear: number;
  amount: number;
  noOfDays: number;
}>;

const savingsStorage = new StableBTreeMap<string, Saving>(0, 44, 1024);

/**
 * Retrieves all savings records.
 * @returns Result<Vec<Saving>, string> - Result containing the list of savings records or an error message.
 */
$query;
export function getAllSavings(): Result<Vec<Saving>, string> {
  return Result.Ok(savingsStorage.values());
}

/**
 * Creates a new saving record.
 * @param payload - The saving payload containing username, specifiedYear, amount, and noOfDays.
 * @returns Result<Saving, string> - Result containing the created saving record or an error message.
 */
$update;
export function createSaving(payload: SavingPayload): Result<Saving, string> {
  const saving: Saving = {
    id: uuidv4(),
    createdAt: ic.time(),
    updatedAt: Opt.None,
    ...payload,
  };
  savingsStorage.insert(saving.id, saving);
  return Result.Ok(saving);
}

/**
 * Retrieves a saving record by its ID.
 * @param id - The ID of the saving record to retrieve.
 * @returns Result<Saving, string> - Result containing the retrieved saving record or an error message.
 */
$query;
export function getSavingById(id: string): Result<Saving, string> {
  return match(savingsStorage.get(id), {
    Some: (saving) => Result.Ok<Saving, string>(saving),
    None: () => Result.Err<Saving, string>(`Saving with id=${id} not found`),
  });
}

/**
 * Calculates the annual percentage yield (APY) based on the provided parameters.
 * @param days - The number of days the saving is held.
 * @param amount - The amount of the saving.
 * @param specifiedyear - The specified year for APY calculation.
 * @returns Result<number, string> - Result containing the calculated APY or an error message.
 */
$query;
export function calculateApy(
  days: number,
  amount: number,
  specifiedyear: number
): Result<number, string> {
  const quoficientOfDays = days / specifiedyear;
  return Result.Ok(quoficientOfDays * amount);
}

/**
 * Deletes a saving record by its ID.
 * @param id - The ID of the saving record to delete.
 * @returns Result<Saving, string> - Result containing the deleted saving record or an error message.
 */
$update;
export function deleteSaving(id: string): Result<Saving, string> {
  return match(savingsStorage.remove(id), {
    Some: (saving) => Result.Ok<Saving, string>(saving),
    None: () =>
      Result.Err<Saving, string>(
        `Couldn't delete saving with id=${id}.`
      ),
  });
}

/**
 * Updates an existing saving record with new information.
 * @param id - The ID of the saving record to update.
 * @param updatedPayload - The updated saving payload containing the new values to update.
 * @returns Result<Saving, string> - Result containing the updated saving record or an error message.
 */
$update;
export function updateSaving(
  id: string,
  updatedPayload: SavingPayload
): Result<Saving, string> {
  const saving = getSavingById(id);

  if (saving.isErr()) {
    return Result.Err<Saving, string>(`Saving with id=${id} not found.`);
  }

  const updatedSaving = {
    ...saving.unwrap(),
    ...updatedPayload,
    updatedAt: Opt.Some(ic.time()),
  };

  savingsStorage.insert(id, updatedSaving);

  return Result.Ok<Saving, string>(updatedSaving);
}

/**
 * Adds funds to a saving record.
 * @param id - The ID of the saving record to fund.
 * @param amount - The amount of funds to add.
 * @returns Result<Saving, string> - Result containing the updated saving record or an error message.
 */
$update;
export function fundSaving(id: string, amount: number): Result<Saving, string> {
  const saving = getSavingById(id);

  if (saving.isErr()) {
    return Result.Err<Saving, string>(`Saving with id=${id} not found.`);
  }

  const updatedSaving = {
    ...saving.unwrap(),
    amount: saving.unwrap().amount + amount,
    updatedAt: Opt.Some(ic.time()),
  };

  savingsStorage.insert(id, updatedSaving);

  return Result.Ok<Saving, string>(updatedSaving);
}

/**
 * Withdraws funds from a saving record.
 * @param id - The ID of the saving record to withdraw funds from.
 * @returns Result<Saving, string> - Result containing the updated saving record or an error message.
 */
$update;
export function withdrawSaving(id: string): Result<Saving, string> {
  const saving = getSavingById(id);

  if (saving.isErr()) {
    return Result.Err<Saving, string>(`Saving with id=${id} not found.`);
  }

  const updatedSaving = {
    ...saving.unwrap(),
    amount: 0,
    updatedAt: Opt.Some(ic.time()),
  };

  savingsStorage.insert(id, updatedSaving);

  return Result.Ok<Saving, string>(updatedSaving);
}

/**
 * Transfers a saving record to another user.
 * @param id - The ID of the saving record to transfer.
 * @param recipient - The username of the recipient user.
 * @returns Result<Saving, string> - Result containing the updated saving record or an error message.
 */
$update;
export function transferSaving(
  id: string,
  recipient: string
): Result<Saving, string> {
  const saving = getSavingById(id);

  if (saving.isErr()) {
    return Result.Err<Saving, string>(`Saving with id=${id} not found.`);
  }

  const updatedSaving = {
    ...saving.unwrap(),
    username: recipient,
    updatedAt: Opt.Some(ic.time()),
  };

  savingsStorage.insert(id, updatedSaving);

  return Result.Ok<Saving, string>(updatedSaving);
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
