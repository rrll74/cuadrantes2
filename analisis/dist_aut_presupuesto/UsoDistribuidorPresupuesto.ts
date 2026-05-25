const distribuidor = new DistribuidorPresupuesto();

const misMateriales: Material[] = [
  { codigo: 'MAT01', descripcion: 'Arena fina', precio: 12.50 },
  { codigo: 'MAT02', descripcion: 'Cemento gris', precio: 45.80 },
  { codigo: 'MAT03', descripcion: 'Ladrillo cerámico', precio: 0.85 },
  { codigo: 'MAT04', descripcion: 'Pintura blanca', precio: 85.00 }
];

try {
  const resultado = distribuidor.distribuir(1500.00, misMateriales);
  
  console.table(resultado);
  
  const totalReal = resultado.reduce((acc, r) => acc + r.subtotal, 0);
  console.log(`Total cuadrado: ${totalReal.toFixed(2)}€`);
} catch (error) {
  console.error("Error en la distribución:", error.message);
}