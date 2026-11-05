// Enquiry form configuration. The endpoint stays empty until a real, reviewed destination exists
// (owner register items: form backend, enquiry routing, privacy process). With no endpoint the form
// renders with a disabled submit button and can never claim that an enquiry was sent.
export default {
  endpoint: process.env.ENQUIRY_ENDPOINT || '',
};
