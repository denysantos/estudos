//==========================DOM document object model ==========================
let titulo = document.getElementById("titulo");
console.log(titulo);

let titulo2 = document.querySelector("#titulo");
console.log(titulo2);

let lista = document.querySelectorAll("#lista li");
console.log(lista);

titulo.innerHTML = "Novo <italic>teste</italic> título";

lista.forEach((item) => {
    let texto = item.innerHTML;
    item.innerHTML = texto.toUpperCase();
});

document.querySelector('h1');

document.querySelectorAll('label');

//pesquisa se o elemento h1 possui a classe grande (style.css)
document.querySelector('h1').classList.contains('grande')

document.querySelector('h1').classList.add('grande')

document.querySelector('h1').classList.remove('grande')

document.querySelector('h1').classList.toggle('grande')


//==========================Arrays II: map e filter==============================

/*
let lista = ['farinha', 'açúcar', 'fermento', 'ovo', 'leite', 'manteiga'];

//exemplo 1 funcao map
let lista2 = lista.map((item) => {
    return item.toUpperCase();
})

console.log(lista);
console.log(lista2);

//exemplo 2 funcao filter
let lista3 = lista.filter((item) => {
    if (item.length > 5) {
        return true;
    } else {
        return false;
    }
})

console.log(lista3);

//exemplo 3 - idem acima, mas simplificado (true ou false)
let lista4 = lista.filter((item) => {
    return item.length >= 5;
})

console.log(lista4);


//exemplo 4 - idem acima, mas simplificado ainda mais (true ou false)
let lista5 = lista.filter(item => item.length >= 3);

console.log(lista5);




//==========================Arrays I: iteração e busca============================== 
let lista = ["maça", "banana", "laranja", "uva"];

//exemplo 1
let q = 0;
while (q < lista.length) {
    console.log(lista[q]);
    q++;
}
console.log("*****fim exemplo 1*****");

//exemplo 2
for (let i = 0; i < lista.length; i++) {
    console.log(lista[i]);
}
console.log("*****fim exemplo 2*****");

//exemplo 3
function imprimirLista(lista) {
    console.log(lista);
}
lista.forEach(imprimirLista);
console.log("*****fim exemplo 3*****");

//exemplo 4
lista.forEach(function (item) {
    console.log(item);
});
console.log("*****fim exemplo 4*****");
console.log("**********");

//exemplo 5
lista.forEach((item) => {
    console.log(item);
});
console.log("*****fim exemplo 5*****");
console.log("**********");


//exemplo 6
if(lista.includes("jaca")) {
    console.log("A lista contém jaca");
} else {
    console.log("A lista não contém jaca");
};
console.log("*****fim exemplo 6*****");

//exemplo 7
let fruta = lista.find((item) => {
    if (item == 'banana') {
        return true;
    } else {
        return false;
    }
});
console.log("Fruta encontrada: " + fruta);
console.log("*****fim exemplo 7*****");




//==========================Formulas de matematica==============================

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


