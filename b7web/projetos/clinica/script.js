document.getElementById("formAgendamento").addEventListener("submit", function(e){
  e.preventDefault();

  // Converter datetime-local para formato MySQL
  let dataHoraInput = document.getElementById("dataHora").value;
  let dataHoraFormatada = dataHoraInput.replace("T", " ") + ":00"; 
  // Exemplo: "2026-07-01T09:00" -> "2026-07-01 09:00:00"

  const dados = {
    paciente_nome: document.getElementById("nome").value,
    cpf: document.getElementById("cpf").value,
    medico_id: document.getElementById("medico").value,
    data_hora: dataHoraFormatada,
    tipo: document.getElementById("tipo").value
  };

  // Envia para o backend Node.js
  fetch("http://localhost:3000/agendar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados)
  })
  .then(res => res.text())
  .then(msg => {
    document.getElementById("mensagem").innerText = msg;
    document.getElementById("mensagem").style.color = msg.includes("sucesso") ? "green" : "red";
  })
  .catch(err => {
    document.getElementById("mensagem").innerText = "Erro de conexão com o servidor!";
    document.getElementById("mensagem").style.color = "red";
    console.error(err);
  });
});
