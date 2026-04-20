"use client";
export function PremiumGate({ feature }: { feature: string }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:400, gap:16 }}>
      <div style={{ fontSize:"3rem" }}>&#x1F512;</div>
      <h2 style={{ color:"#fff", fontWeight:700, fontSize:"1.25rem" }}>Premium Feature</h2>
      <p style={{ color:"#94a3b8", textAlign:"center", maxWidth:360 }}>{feature} is available on the Premium plan.</p>
      <button style={{ background:"#059669", color:"#fff", padding:"10px 24px", border:"none", borderRadius:8, cursor:"pointer", fontWeight:500 }}>
        Upgrade to Premium
      </button>
    </div>
  );
}
