import app from "./app.js";
import { PORT } from "./src/config/index.js";

// app.listen(PORT, () => {
//     console.log(`🚀 Server running at http://localhost:${PORT}`);
// });


app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
});