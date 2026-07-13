//******Formulas de matematica*****************

//valor de procedimento na tabela cbhpm
function valorProcedimento(codigo,edicao,deflator) {
    let edicaoCbhpm = edicao;
    let valorPorte = 0;
    let qtUco = 11.5;
    let valorFilme = 30.03;
    let percDeflator = deflator;
    let valorTotal = 0;
    if (edicaoCbhpm === 2014) {
        if (codigo === 10101012) {
            valorPorte = 76.40;
            valorFilme = 0;
        } else if (codigo === 10101013) {
            valorPorte = 100.90;
        } 
    }


    valorTotal = (valorPorte + (qtUco * 10) + valorFilme) * percDeflator;
    return valorTotal;
}

console.log("Valor do procedimento: R$" + valorProcedimento(10101012,2014,1).toFixed(2));




//juros simples
function jurosSimples(capital, taxa, tempo) {
    let juros = capital * taxa * tempo;
    return juros;
}
//se eu aplicar R$1000,00 a uma taxa de 5% ao mês durante 2 meses, quanto de juros eu vou receber?
console.log("Juros Simples: R$" + jurosSimples(1000, 0.05, 2).toFixed(2));

//calculo de area
function calcArea(largura, comprimento) {
    let area = largura * comprimento;
    return area;
}

console.log("Área: " + calcArea(10, 5) + " m²");



// Regra de 3: a/b = c/x => x = (b*c)/a
//Se o meu carro percorre 13km com 1 litro de gasolina, quantos litros ele percorre com 750 km?
function regraDeTres(a, b, c) {
    let x = (b * c) / a;
    return x;
}

console.log("Regra de 3: " + regraDeTres(10, 1, 750).toFixed(2) + " litros");



function velocidadeMedia(distancia, tempo) {
    let velocidade = distancia / tempo;
    return velocidade;
}

console.log("Velocidade média: " + velocidadeMedia(750, 7).toFixed(2));

function calcDesconto(valor, desconto) {
    let valorComDesconto = valor - (valor * desconto / 100);
    return valorComDesconto;
}

console.log("Preço com desconto: R$" + calcDesconto(100, 20).toFixed(2));


function calcImc(peso, altura) {
    let imc = peso / (altura * altura);    

    if (imc < 18.5) {
        return imc.toFixed(2) + " - Abaixo do peso";
    } else if (imc > 18.5 && imc < 24.9) {
        return imc.toFixed(2) + " - Peso normal";
    } else if (imc > 25 && imc < 29.9) {
        return imc.toFixed(2) + " - Pre-obesidade";
    } else if (imc > 30 && imc < 34.9) {
        return imc.toFixed(2) + " - Obesidade grau 1";
    } else if (imc > 35 && imc < 39.9) {
        return imc.toFixed(2) + " - Obesidade grau 2";
    } else if (imc > 40) {
        return imc.toFixed(2) + " - Obesidade grau 3";
    }   

    return imc;

}

console.log(calcImc(73, 1.73));




/*
function formatEmail(email) {
    let formattedEmail = email.trim().toLowerCase();
    return formattedEmail;
}


let name = "John Doe";
let age = 30;
let isStudent = true;
let firstName = "John";
let lastName = "Doe";
let email = "  JOHN.DOE@EXAMPLE.COM  ";
let emailFormatted = formatEmail(email);

//métodos de string
console.log(name.length);
console.log(name.toLowerCase());
console.log(email.toLowerCase());
console.log(emailFormatted.toLowerCase());

console.log(formatEmail(email));
*/


/* 

const phrase = "Ola, eu sou o " + firstName + " " + lastName + " e tenho " + age + " anos.";
console.log(phrase);

const fullName = `${firstName} ${lastName}`;
const prhase2 = `Ola, eu sou o ${fullName} e tenho ${age} anos.`;
console.log(prhase2);

age = 31; // Updating the age variable

console.log("Name:", name);
console.log("Age:", age);
console.log("Is Student:", isStudent);


console.log("Hello, World!");
console.error("Deu pau.");
console.warn("This is a warning message.");

 */


