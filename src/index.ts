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

$query;
export function getAllSavings(): Result<Vec<Saving>, string> {
  return Result.Ok(savingsStorage.values());
}

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

$query;
export function getSavingById(id: string): Result<Saving, string> {
  return match(savingsStorage.get(id), {
    Some: (saving) => Result.Ok<Saving, string>(saving),
    None: () => Result.Err<Saving, string>(`saving with id=${id} not found`),
  });
}

$query;
export function calculateApy(
  days: number,
  amount: number,
  specifiedyear: number
): Result<number, string> {
  const quoficientOfDays = days / specifiedyear;
  return quoficientOfDays * amount;
}

$update;
export function deleteSaving(id: string): Result<Saving, string> {
  return match(savingsStorage.remove(id), {
    Some: (saving) => Result.Ok<Saving, string>(saving),
    None: () =>
      Result.Err<Saving, string>(
        `couldn't delete saving with id=${id}.`
      ),
  });
}

$update;
export function fundSaving(id: string, amount: number): Result<Saving, string> {
  const saving = getSavingById(id);

  if (saving.isErr()) {
    return Result.Err<Saving, string>(`saving with id=${id} not found.`);
  }

  const updatedSaving = {
    ...saving.unwrap(),
    amount: saving.unwrap().amount + amount,
  };

  savingsStorage.insert(saving.id, updatedSaving);

  return Result.Ok<Saving, string>(updatedSaving);
}

$update;
export function withdrawSaving(id: string): Result<Saving, string> {
  const saving = getSavingById(id);

  if (saving.isErr()) {
    return Result.Err<Saving, string>(`saving with id=${id} not found.`);
  }

  const updatedSaving = {
    ...saving.unwrap(),
    amount: 0,
  };

  savingsStorage.insert(saving.id, updatedSaving);

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
