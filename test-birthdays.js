const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImlhdCI6MTczMTQ0OTI4MH0.qZWp0YcLPGXZxHjY3J_aSxA8XqGxqGLt59r8ZY2Fzuw';

fetch('https://rhf-beta.vercel.app/api/employees', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
  console.log('=== TESTE DE ANIVERSÁRIOS ===\n');
  console.log('Total funcionários:', data.length);
  
  const withBday = data.filter(e => e.birth_date && e.status === 'active');
  console.log('Ativos com data de nascimento:', withBday.length);
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  console.log('\nMês atual:', currentMonth, '(' + new Date().toLocaleString('pt-BR', { month: 'long' }) + ')');
  console.log('Ano atual:', currentYear);
  
  console.log('\n=== TODOS OS FUNCIONÁRIOS COM DATA DE NASCIMENTO ===');
  withBday.forEach(e => {
    const birthDate = new Date(e.birth_date + 'T00:00:00');
    const birthMonth = birthDate.getMonth() + 1;
    const birthDay = birthDate.getDate();
    const isThisMonth = birthMonth === currentMonth;
    
    console.log(`${e.name}:`);
    console.log(`  Data: ${e.birth_date} (${birthDay}/${birthMonth}/${birthDate.getFullYear()})`);
    console.log(`  Mês do aniversário: ${birthMonth}`);
    console.log(`  É este mês? ${isThisMonth ? 'SIM ✅' : 'NÃO ❌'}`);
    console.log('');
  });
  
  const birthdaysThisMonth = withBday.filter(e => {
    const birthDate = new Date(e.birth_date + 'T00:00:00');
    const birthMonth = birthDate.getMonth() + 1;
    return birthMonth === currentMonth;
  });
  
  console.log('=== ANIVERSARIANTES DESTE MÊS ===');
  console.log('Total:', birthdaysThisMonth.length);
  birthdaysThisMonth.forEach(e => {
    console.log(`- ${e.name} (${e.birth_date})`);
  });
})
.catch(err => console.error('Erro:', err));
