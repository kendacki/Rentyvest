<div align="center" style="font-family: 'Times New Roman', Times, serif;">

<img src="apps/web/public/logo.png" alt="RentyVest logo" width="120" />

<h1 style="font-family: 'Times New Roman', Times, serif; color: #1a1a1a; letter-spacing: 0.04em;">
RENTYVEST
</h1>

<p style="font-family: 'Times New Roman', Times, serif; font-size: 1.25rem; color: #E85D04;">
<strong>Invest in property one slot at a time</strong>
</p>

<p style="font-family: 'Times New Roman', Times, serif; font-size: 1.05rem; max-width: 640px; margin: 0 auto;">
Fractional real estate on the Canton Network. Built for the Canton DevNet hackathon with Loop wallet, tUSDC, and on ledger PropertyNFTs.
</p>

</div>

<br />

<div style="font-family: 'Times New Roman', Times, serif; line-height: 1.7; color: #222;">

<h2 style="font-family: 'Times New Roman', Times, serif; background: #E85D04; color: #fff; padding: 10px 16px; display: inline-block; border-radius: 4px;">

<hr style="border: none; border-top: 2px solid #E85D04; margin: 28px 0;" />

<h2 style="font-family: 'Times New Roman', Times, serif; background: #E85D04; color: #fff; padding: 10px 16px; display: inline-block; border-radius: 4px;">
The problem we solve
</h2>

<p>
Owning real estate usually means one big payment, slow paperwork, and almost no way for everyday people to buy a small piece of a building. Most platforms either stay fully off ledger or treat property like a vague token with no clear share of the asset.
</p>

<p>
<strong>RentyVest makes property investable in small, clear units called slots.</strong>
</p>

<ol>
  <li>Each listing is split into a fixed number of slots at a fixed price.</li>
  <li>Investors pay with tUSDC on Canton DevNet.</li>
  <li>Each pledged slot becomes a PropertyNFT that proves ownership of that share.</li>
  <li>Sellers raise capital slot by slot instead of waiting for one full buyer.</li>
</ol>

<p>
We are building infrastructure for the next generation of property investing: transparent pools, live fill progress, and settlement that can be verified on the ledger.
</p>

<hr style="border: none; border-top: 2px solid #E85D04; margin: 28px 0;" />

<h2 style="font-family: 'Times New Roman', Times, serif; background: #E85D04; color: #fff; padding: 10px 16px; display: inline-block; border-radius: 4px;">
What we want to change in the market
</h2>

<p>
Today the market asks people to choose between “buy the whole Apartment” or “buy a vague crypto claim.” We want a third path: <strong>buy a real share of a named property, settle it on Canton, and hold proof as an NFT.</strong>
</p>

<h3 style="font-family: 'Times New Roman', Times, serif; color: #E85D04; border-left: 6px solid #E85D04; padding-left: 12px;">
Example 1: Ada the Young professional
</h3>

<p>
Ada wants exposure to a Lagos apartment tower but cannot put down the full purchase price. On RentyVest she connects Loop, claims faucet tUSDC, opens Ivy Towers on the marketplace, and pledges two slots. She now holds two PropertyNFTs. Her ownership is visible, countable, and transferable on ledger. She did not need a mortgage. She did not need to trust a spreadsheet.
</p>

<h3 style="font-family: 'Times New Roman', Times, serif; color: #E85D04; border-left: 6px solid #E85D04; padding-left: 12px;">
Example 2: The property owner
</h3>

<p>
Chidi owns a duplex and needs capital for renovation. Instead of selling the whole building, he lists 100 slots at a clear price per slot. As investors pledge, the pool fills in realtime. When the pool is complete, he has raised capital while keeping a structured ownership story for every slot holder. Fundraising becomes a marketplace motion, not a private negotiation.
</p>

<h3 style="font-family: 'Times New Roman', Times, serif; color: #E85D04; border-left: 6px solid #E85D04; padding-left: 12px;">
Example 3: What this means for Canton
</h3>

<p>
Canton is strong at multi party agreement and privacy aware settlement. RentyVest shows that strength in a story anyone can follow: wallet, faucet, browse, pledge, NFT.  This means Daml templates, admin settlement, and Loop users working together to execute tasks without asking the audience to learn technical jargons first.
</p>

<hr style="border: none; border-top: 2px solid #E85D04; margin: 28px 0;" />

<h2 style="font-family: 'Times New Roman', Times, serif; background: #E85D04; color: #fff; padding: 10px 16px; display: inline-block; border-radius: 4px;">
User flow (demo path)
</h2>

<ol>
  <li>
    <strong>Connect wallet.</strong>
    Open the app and connect a Canton wallet. On DevNet we recommend Loop. Chain id used in the app is <code>canton:sandbox</code>.
  </li>
  <li>
    <strong>Claim faucet tUSDC.</strong>
    Claim test funds to the connected party so the investor can pledge. Faucet amount is demo tUSDC with a daily limit.
  </li>
  <li>
    <strong>Seller lists a property (optional in short demos).</strong>
    A seller submits a listing request with title, location, total slots, and price per slot.
  </li>
  <li>
    <strong>Team approves and goes live.</strong>
    After approval, the platform creates a PropertyPool on Canton and publishes the listing to the marketplace.
  </li>
  <li>
    <strong>Browse the marketplace.</strong>
    Investors compare slot price, slots filled, and remaining capacity. Progress updates live.
  </li>
  <li>
    <strong>View opportunity and pledge.</strong>
    Investor opens a property, sees one combined tUSDC wallet balance, picks slot count, and confirms the pledge.
  </li>
  <li>
    <strong>Receive PropertyNFTs.</strong>
    Settlement mints one PropertyNFT per pledged slot to the buyer. Ownership appears in portfolio views.
  </li>
</ol>

<p>
Connect and fund → Pick your pool → Own a property share.
</p>

<hr style="border: none; border-top: 2px solid #E85D04; margin: 28px 0;" />

<h2 style="font-family: 'Times New Roman', Times, serif; background: #E85D04; color: #fff; padding: 10px 16px; display: inline-block; border-radius: 4px;">
How pledges work
</h2>

<ol>
  <li>
    <strong>PropertyPool.</strong>
    Every live listing maps to a Daml PropertyPool with a fixed slot count, a fixed slot price, and a fill index.
  </li>
  <li>
    <strong>Investor chooses slots.</strong>
    The app checks that the investor has enough tUSDC and that the pool still has room.
  </li>
  <li>
    <strong>Payment asset.</strong>
    The investor pays from a tUSDC Asset holding on Canton. If they claimed the faucet more than once, the UI shows one combined balance while settlement uses a holding that covers the cost.
  </li>
  <li>
    <strong>Pledge choice.</strong>
    The platform exercises the Pledge choice on the PropertyPool. Payment is escrowed to the platform admin side of the deal.
  </li>
  <li>
    <strong>NFT mint.</strong>
    The ledger mints PropertyNFT contracts, one per slot, to the buyer.
  </li>
  <li>
    <strong>Pool updates.</strong>
    Slots filled increase. The marketplace progress bar moves. When the pool is full, fundraising for that listing is complete.
  </li>
</ol>

<p>
you pay tUSDC for slots, the ledger records the deal, and you walk away with NFT proof of your share and earn yields on the property in the future.</strong>
</p>

<hr style="border: none; border-top: 2px solid #E85D04; margin: 28px 0;" />

<h2 style="font-family: 'Times New Roman', Times, serif; background: #E85D04; color: #fff; padding: 10px 16px; display: inline-block; border-radius: 4px;">
</h2>

<table style="font-family: 'Times New Roman', Times, serif; width: 100%; border-collapse: collapse;">
  <tr style="background: #FFF3E8;">
    <th style="text-align: left; padding: 10px; border-bottom: 2px solid #E85D04;">What</th>
    <th style="text-align: left; padding: 10px; border-bottom: 2px solid #E85D04;">Value</th>
  </tr>
  <tr>
    <td style="padding: 10px; border-bottom: 1px solid #eee;">Product</td>
    <td style="padding: 10px; border-bottom: 1px solid #eee;">RentyVest</td>
  </tr>
  <tr>
    <td style="padding: 10px; border-bottom: 1px solid #eee;">Network</td>
    <td style="padding: 10px; border-bottom: 1px solid #eee;">Canton DevNet (FiveNorth sandbox)</td>
  </tr>
  <tr>
    <td style="padding: 10px; border-bottom: 1px solid #eee;">Package name</td>
    <td style="padding: 10px; border-bottom: 1px solid #eee;"><code>rentyvest-markets</code></td>
  </tr>
  <tr>
    <td style="padding: 10px; border-bottom: 1px solid #eee;">Package ID</td>
    <td style="padding: 10px; border-bottom: 1px solid #eee;"><code>cc954855d219c06fdd06c3116708b2bf6a5665c16ac34ebda25fa4460fd8926a</code></td>
  </tr>
  <tr>
    <td style="padding: 10px; border-bottom: 1px solid #eee;">USDC issuer contract ID</td>
    <td style="padding: 10px; border-bottom: 1px solid #eee;"><code>00cea73cb734663dfe210db96005e5b7dbd2d878e8a18e53092ecfe79a0eafd822ca121220de32ed764fb421d4b1399c374fcc4add3c0dc7230e7bdd57987f0797b81336b8</code></td>
  </tr>
  <tr>
    <td style="padding: 10px; border-bottom: 1px solid #eee;">Property pool template</td>
    <td style="padding: 10px; border-bottom: 1px solid #eee;"><code>RentyVest.PropertyPool:PropertyPool</code></td>
  </tr>
  <tr>
    <td style="padding: 10px; border-bottom: 1px solid #eee;">Payment asset template</td>
    <td style="padding: 10px; border-bottom: 1px solid #eee;"><code>RentyVest.TestUSDC:Asset</code></td>
  </tr>
  <tr>
    <td style="padding: 10px; border-bottom: 1px solid #eee;">Issuer template</td>
    <td style="padding: 10px; border-bottom: 1px solid #eee;"><code>RentyVest.TestUSDC:USDCIssuer</code></td>
  </tr>
  <tr>
    <td style="padding: 10px; border-bottom: 1px solid #eee;">Demo currency</td>
    <td style="padding: 10px; border-bottom: 1px solid #eee;">tUSDC</td>
  </tr>
  <tr>
    <td style="padding: 10px; border-bottom: 1px solid #eee;">Chain ID</td>
    <td style="padding: 10px; border-bottom: 1px solid #eee;"><code>canton:sandbox</code></td>
  </tr>
  <tr>
    <td style="padding: 10px; border-bottom: 1px solid #eee;">Public ledger API host</td>
    <td style="padding: 10px; border-bottom: 1px solid #eee;"><code>ledger-api.validator.devnet.sandbox.fivenorth.io</code></td>
  </tr>
</table>

<hr style="border: none; border-top: 2px solid #E85D04; margin: 28px 0;" />

<h2 style="font-family: 'Times New Roman', Times, serif; background: #E85D04; color: #fff; padding: 10px 16px; display: inline-block; border-radius: 4px;">
Stack at a glance
</h2>

<ol>
  <li><strong>Frontend:</strong> Next.js web app with marketplace, wallet connect, faucet, listing form, and pledge modal.</li>
  <li><strong>Backend:</strong> Go core API for auth exchange, faucet, listing promotion, pool provisioning, and pledge settlement.</li>
  <li><strong>Ledger:</strong> Daml templates on Canton DevNet (PropertyPool, TestUSDC, PropertyNFT).</li>
  <li><strong>Data:</strong> Supabase for users, properties, pledges, and live slot updates.</li>
  <li><strong>Wallet:</strong> Loop via WalletConnect on Canton sandbox.</li>
</ol>

<hr style="border: none; border-top: 2px solid #E85D04; margin: 28px 0;" />

<h2 style="font-family: 'Times New Roman', Times, serif; background: #E85D04; color: #fff; padding: 10px 16px; display: inline-block; border-radius: 4px;">
Demo checklist
</h2>

<ol>
  <li>Confirm Vercel and Railway use the current package ID and issuer contract ID from the table above.</li>
  <li>Confirm Supabase has no stale pool contract ids after a package redeploy (pools should recreate cleanly).</li>
  <li>Connect Loop, claim faucet, open marketplace, pledge at least one slot, show the success state and NFT outcome.</li>
  <li>Tell the story in one sentence: <em>RentyVest turns buildings into buyable slots settled on Canton with NFT proof.</em></li>
  <li>If asked about money: this is DevNet demo value with tUSDC, not regulated real world securities.</li>
</ol>

<hr style="border: none; border-top: 2px solid #E85D04; margin: 28px 0;" />

<h2 style="font-family: 'Times New Roman', Times, serif; background: #E85D04; color: #fff; padding: 10px 16px; display: inline-block; border-radius: 4px;">
Conclusion
</h2>

<p style="font-size: 1.15rem;">
<strong>RentyVest lets anyone invest in property one slot at a time, settle in tUSDC on Canton, and own the result as a PropertyNFT.</strong>
</p>

<p style="color: #666; font-size: 0.95rem;">
Built on Canton DevNet · Powered by Daml · Wallet ready with Loop
</p>

</div>
