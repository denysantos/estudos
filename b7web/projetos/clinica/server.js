const express = require("express");
const mysql = require("mysql2");

const app = express();
app.use(express.json());

// Conexão com o banco clinica_medica
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "clinica_medica"
});

db.connect(err => {
  if (err) {
    console.error("Erro na conexão:", err);
    return;
  }
  console.log("✅ Conectado ao banco clinica_medica!");
});

// Rota para verificar disponibilidade
app.post("/verificar-disponibilidade", (req, res) => {
  const { medico_id, data_hora } = req.body;

  const sql = "SELECT status FROM agenda_medica WHERE medico_id = ? AND data_hora = ?";
  db.query(sql, [medico_id, data_hora], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Erro ao verificar disponibilidade");
    } else if (result.length === 0) {
      res.send("⚠️ Horário não cadastrado na agenda");
    } else {
      const status = result[0].status;
      if (status === "livre") {
        res.send("✅ Médico disponível neste horário");
      } else {
        res.send("❌ Médico indisponível neste horário");
      }
    }
  });
});

// Rota para inserir agendamento (com atualização da agenda)
app.post("/agendar", (req, res) => {
  const { paciente_nome, cpf, medico_id, data_hora, tipo } = req.body;

  // Primeiro verifica se o horário está livre
  const sqlVerifica = "SELECT status FROM agenda_medica WHERE medico_id = ? AND data_hora = ?";
  db.query(sqlVerifica, [medico_id, data_hora], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Erro ao verificar disponibilidade");
    } else if (result.length === 0) {
      res.status(400).send("⚠️ Horário não cadastrado na agenda");
    } else if (result[0].status === "ocupado") {
      res.status(400).send("❌ Médico indisponível neste horário");
    } else {
      // Se livre, insere o agendamento
      const sqlAgendar = "INSERT INTO agendamentos (paciente_nome, cpf, medico_id, data_hora, tipo) VALUES (?, ?, ?, ?, ?)";
      db.query(sqlAgendar, [paciente_nome, cpf, medico_id, data_hora, tipo], (err, resultInsert) => {
        if (err) {
          console.error(err);
          res.status(500).send("Erro ao salvar agendamento");
        } else {
          // Atualiza a agenda para ocupado
          const sqlAtualiza = "UPDATE agenda_medica SET status = 'ocupado' WHERE medico_id = ? AND data_hora = ?";
          db.query(sqlAtualiza, [medico_id, data_hora], (errUpdate) => {
            if (errUpdate) {
              console.error(errUpdate);
              res.status(500).send("Agendamento salvo, mas erro ao atualizar agenda");
            } else {
              res.send("✅ Agendamento inserido com sucesso e agenda atualizada!");
            }
          });
        }
      });
    }
  });
});

app.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});
