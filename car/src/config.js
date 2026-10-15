// Contact form delivery. Create a free form at https://formspree.io (or any service that accepts a JSON POST),
// point it at the store's email, and set REACT_APP_FORM_ENDPOINT to the form URL when building, e.g.
//   REACT_APP_FORM_ENDPOINT=https://formspree.io/f/abcdwxyz npm run build
// Without it the form falls back to opening the visitor's email app.
export const FORM_ENDPOINT = process.env.REACT_APP_FORM_ENDPOINT || '';
