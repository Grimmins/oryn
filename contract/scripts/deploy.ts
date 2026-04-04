import { ethers, network } from "hardhat"
import * as fs from "fs"
import * as path from "path"

async function main() {
  const [deployer] = await ethers.getSigners()

  console.log(`networkk  : ${network.name}`)
  console.log(`deployer : ${deployer.address}`)
  console.log(`balance  : ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`)

  const factory = await ethers.getContractFactory("PasswordVault")
  const vault = await factory.deploy()
  await vault.waitForDeployment()

  const address = await vault.getAddress()
  console.log(`PasswordVault deployed at: ${address}`)

  // Export address + ABI for the extension
  const artifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/PasswordVault.sol/PasswordVault.json"),
      "utf8"
    )
  )

  const outDir = path.join(__dirname, "../../src/lib")
  fs.mkdirSync(outDir, { recursive: true })

  fs.writeFileSync(
    path.join(outDir, "vault.json"),
    JSON.stringify({ address, abi: artifact.abi }, null, 2)
  )

  console.log(`ABI + address exported to src/lib/vault.json`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
