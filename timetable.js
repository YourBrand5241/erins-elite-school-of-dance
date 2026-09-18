// Kept in sync manually with script.js's ITEMS list — if a class changes
// there, update it here too. Sorted by day of week, then time.
const CLASSES = [
  { day: "Monday", time: "4:00-5:00pm", name: "U8 Team Class", studio: "Studio 1", price: "£8.00" },
  { day: "Monday", time: "5:00-6:00pm", name: "U12 Team Class", studio: "Studio 1", price: "£8.00" },
  { day: "Monday", time: "5:00-6:00pm", name: "U14 Team Class", studio: "Studio 2", price: "£8.00" },
  { day: "Monday", time: "6:00-7:30pm", name: "Stretch & Body Conditioning", studio: "Studio 2", price: "£12.00" },
  { day: "Tuesday", time: "4:00-5:00pm", name: "Minis", studio: "Studio 1", price: "£8.00" },
  { day: "Tuesday", time: "5:00-6:00pm", name: "Juniors", studio: "Studio 1", price: "£8.00" },
  { day: "Tuesday", time: "7:00-7:30pm", name: "Advanced", studio: "Studio 1", price: "£12.00" },
  { day: "Wednesday", time: "6:00-7:30pm", name: "Advanced", studio: "Studio 2", price: "£12.00" },
  { day: "Thursday", time: "4:00-5:00pm", name: "Baby Class", studio: "Studio 1", price: "£8.00" },
  { day: "Thursday", time: "4:30-6:00pm", name: "Inter/Advanced Acro", studio: "Studio 2", price: "£12.00" },
  { day: "Thursday", time: "5:00-6:00pm", name: "Minis", studio: "Studio 1", price: "£8.00" },
  { day: "Thursday", time: "5:00-6:00pm", name: "Juniors", studio: "Studio 2", price: "£8.00" },
  { day: "Thursday", time: "6:00-7:00pm", name: "Novice Acro", studio: "Studio 2", price: "£8.00" },
];

const tbody = document.getElementById("timetable-body");
CLASSES.forEach(c => {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${c.day}</td>
    <td>${c.time}</td>
    <td>${c.name}</td>
    <td>${c.studio}</td>
    <td>${c.price}</td>
  `;
  tbody.appendChild(row);
});
