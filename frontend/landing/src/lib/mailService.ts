export async function sendDemoRequest(data: {
  name: string;
  institute: string;
  email: string;
  phone: string;
}) {
  const response = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      access_key: "13595c1b-ccf2-403f-b332-b1ba43e4f284",
      subject: `New Demo Request from ${data.institute}`,
      from_name: "TuitionOS Website",
      name: data.name,
      email: data.email,
      institute: data.institute,
      phone: data.phone,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to submit demo request.");
  }

  return response.json();
}
