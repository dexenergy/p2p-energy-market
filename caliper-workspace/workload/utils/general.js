const utf8Decoder = new TextDecoder();

async function getPublicKey(contractId, invokerIdentity, sutAdapter) {
    const request = {
        contractId: contractId,
        contractFunction: 'EnergyConsumptionContract:getClientIdentity',
        invokerIdentity: invokerIdentity,
        contractArguments: [],
        readOnly: true
    };
    let result = await sutAdapter.sendRequests(request);
    return utf8Decoder.decode(result.GetResult());
}

function unmarshal(bytes){
    const json = typeof bytes === "string" ? bytes : utf8Decoder.decode(bytes);
    const parsed= JSON.parse(json);
    if (parsed === null || typeof parsed !== "object") {
      throw new Error(`Invalid JSON type (${typeof parsed}): ${json}`);
    }
    return parsed;
  }

/**
 * Split an array into n sub-arrays of equal size
 *  @param {Array} arr - The array to split into sub-arrays
 * @param {number} n - The number of sub-arrays to create 
 * @return {Array} - An array of n sub-arrays
 * 
 * */  
function workerSplit (txList, n) {
  const size = Math.ceil(txList.length / n);
  return Array.from({ length: Math.ceil(txList.length / size) }, (v, i) =>
  txList.slice(i * size, i * size + size)
);
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}
function getTodayDate() {
  const date = new Date();
  const dayOfMonth = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
  return dayOfMonth;
}

module.exports.getPublicKey = getPublicKey;
module.exports.unmarshal = unmarshal;   
module.exports.workerSplit = workerSplit;
module.exports.getRandomInt = getRandomInt;
module.exports.getTodayDate = getTodayDate;
