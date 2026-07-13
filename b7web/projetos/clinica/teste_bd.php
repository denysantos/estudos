<?php
$servername = "localhost";   // servidor local
$username   = "root";        // usuário padrão do XAMPP
$password   = "";            // senha padrão (normalmente vazia no XAMPP)
$dbname     = "clinica_medica";     // nome do banco que você criou

// Criar conexão
$conn = new mysqli($servername, $username, $password, $dbname);

// Verificar conexão
if ($conn->connect_error) {
    die("Falha na conexão: " . $conn->connect_error);
} else {
    echo "✅ Conexão realizada com sucesso!";
}

$conn->close();
