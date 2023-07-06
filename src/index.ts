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
  Principal,
  $init,
} from "azle";
import { v4 as uuidv4 } from "uuid";

//Record to store the saving details
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

//map to store the savings
const savingsStorage = new StableBTreeMap<string, Saving>(0, 44, 1024);

//store the admin principal
let adminPrincipal : Principal;

//store the whitelisted accounts
let whitelistedAccounts : Vec<string>;

//intialize some parametrs on deployment
$init;
export function init(admin: string, whitelist : Vec<string>) : void{
  adminPrincipal = Principal.fromText(admin);
  whitelistedAccounts = whitelist;
}

//check if the caller is a whitelisted account
$query;
export function isWhitelisted(id : string) : boolean{
  if(whitelistedAccounts.includes(id)){
    return true;
  }
  return false;
}

//get all savings in the canister
$query;
export function getAllSavings(): Result<Vec<Saving>, string> {
  return Result.Ok(savingsStorage.values());
}


//create  saving
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


//get a specific saving by its id
$query;
export function getSavingById(id: string): Result<Saving, string> {
  return match(savingsStorage.get(id), {
    Some: (saving) => Result.Ok<Saving, string>(saving),
    None: () => Result.Err<Saving, string>(`saving with id=${id} not found`),
  });
}


//helper function to check whether time has passed
$query;
export function hasTimePassed(startTime :nat64, noOfDays: number): boolean{
  const nanoseconds =  noOfDays * 24 * 60 * 60 * 1000 * 1000 * 1000;
  const endTimeInNanoseconds = startTime + BigInt(nanoseconds);
  return ic.time() < endTimeInNanoseconds;
}


//calculate APY for the saving
$query;
export function calculateApy(
  days: number,
  amount: number,
  specifiedyear: number
): Result<number, string> {
  const quoficientOfDays = days / specifiedyear;
  return Result.Ok<number,string>(quoficientOfDays * amount);
}


//delete saving by the owner
$update;
export function deleteSaving(id: string): Result<Saving, string> {
  const caller = ic.caller().toString();
  if(caller !== adminPrincipal.toString()){
    return Result.Err<Saving,string>("You are not authorized to delete a saving")
  }

  return match(savingsStorage.remove(id), {
    Some: (saving) => Result.Ok<Saving, string>(saving),
    None: () =>
      Result.Err<Saving, string>(
        `couldn't delete saving with id=${id}.`
      ),
  });
}


//fund the saving campaign
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


//withdraw saving by the owner or the whitelisted ID
$update;
export function withdrawSaving(id: string): Result<Saving, string> {
  const caller = ic.caller().toString();
  if((caller === adminPrincipal.toString()) || isWhitelisted(caller)){

    return match(savingsStorage.get(id),{
      None : ()=>{ return Result.Err<Saving,string>(`Unable to withdraw savings with id=${id}`)},
      Some : (saving)=>{
        if(!hasTimePassed(saving.createdAt,saving.noOfDays)){
          return Result.Err<Saving,string>("Time has not yet passed. Your funds are still locked")
        }

      const updatedSaving = {
        ...saving.unwrap(),
        amount: 0,
      };

      savingsStorage.insert(saving.id, updatedSaving);

      return Result.Ok<Saving, string>(updatedSaving);
      }
    });
  }
  return Result.Err<Saving,string>("You are not authorized to withdraw a saving")
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
