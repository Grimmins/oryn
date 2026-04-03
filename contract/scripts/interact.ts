import { ethers } from "hardhat"
import * as fs from "fs"
import * as path from "path"

async function main() {
  const [signer] = await ethers.getSigners()
  console.log(`Signer: ${signer.address}`)

  const { address, abi } = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../../src/lib/vault.json"), "utf8")
  )
  const vault = new ethers.Contract(address, abi, signer)
  console.log(`Contract: ${address}\n`)

  function fakeBlob(content: string): string {
    const nonce = ethers.randomBytes(12)
    const data = ethers.toUtf8Bytes(content)
    return ethers.concat([nonce, data])
  }

  function fakeSiteHash(domain: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(domain))
  }


  const entries = [
    { domain: "github.com",   password: "gh_secret_123",   username: "alice@gmail.com" },
    { domain: "google.com",   password: "g00gle_p4ss",     username: "alice@gmail.com" },
    { domain: "figma.com",    password: "figma_rocks_99",  username: "alice@figma.io"  },
  ]

  console.log("Saving passwords...")
  console.log("--------------------------------")
  let nonce = await ethers.provider.getTransactionCount(signer.address, "latest")
  for (const e of entries) {
    const siteHash = fakeSiteHash(e.domain)
    const blobPW = fakeBlob(e.password)
    const blobU  = fakeBlob(e.username)

    const tx = await vault.savePassword(siteHash, blobPW, blobU, { nonce: nonce++ })
    await tx.wait()
    console.log(`${e.domain} saved (siteHash: ${siteHash.slice(0, 10)}...)`)
  }


  console.log("\nVault state")
  console.log("---------------------------")
  const size = await vault.vaultSize()
  console.log("Vault size: ${size} entries")

  const [allHashes, , , allVersions] = await vault.getAllPasswords()
  for (let i = 0; i < allHashes.length; i++) {
    console.log(`  [${i}] ${allHashes[i].slice(0, 10)}...  v${allVersions[i]}`)
  }

  console.log("\nget github.com entry")
  console.log("---------------------------------------")
  const githubHash = fakeSiteHash("github.com")
  const [blobPW, blobU, version, updatedAt] = await vault.getPassword(githubHash)
  console.log(`version : ${version}`)
  console.log(`updatedAt : ${new Date(Number(updatedAt) * 1000).toISOString()}`)
  console.log(`blobPW : ${ethers.hexlify(blobPW).slice(0, 30)}...`)
  console.log(`blobU : ${ethers.hexlify(blobU).slice(0, 30)}...`)


  const [, , version2] = await vault.getPassword(githubHash)
  console.log(`version after update: ${version2}`)

  console.log("\nget all passwords")
  console.log("---------------------------");
  const [siteHashes, , , versions, updatedAts] = await vault.getAllPasswords()
  for (let i = 0; i < siteHashes.length; i++) {
    console.log(`  ${siteHashes[i].slice(0, 10)}...  v${versions[i]}  ${new Date(Number(updatedAts[i]) * 1000).toISOString()}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
