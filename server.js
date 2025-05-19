const express = require('express');
const mysql = require('mysql2');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8000;

// Conexão com MySQL usando Promises
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
}).promise();

// Testa conexão
(async () => {
  try {
    await db.connect();
    console.log('Conexão com o banco de dados MySQL estabelecida com sucesso!');
  } catch (err) {
    console.error('Erro ao conectar no banco de dados:', err.message);
  }
})();

app.use(express.json()); // Habilita o uso de JSON no corpo das requisições

// Serve arquivos estáticos (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/imagens_div', express.static(path.join(__dirname, 'public/imagens_div')));

// Rota principal exibindo produtos
app.get('/', async (req, res) => {
  try {
    await db.query('SELECT * FROM produto'); // Apenas para verificar conexão, resultado não usado
    res.sendFile(path.join(__dirname, 'public', 'views', 'Home.html'));
  } catch (err) {
    console.error('Erro ao carregar a página inicial:', err.message);
    res.status(500).send('Erro ao carregar a página');
  }
});

// Rota para buscar todos os produtos
app.get('/produtos', async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM produto');
    res.json(results);
  } catch (err) {
    console.error('Erro ao buscar produtos:', err.message);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

// Rota para buscar produtos por categoria
app.get('/produtos/categoria/:categoria', async (req, res) => {
  const categoria = req.params.categoria;
  let sql = 'SELECT * FROM produto';
  const values = [];

  if (categoria !== 'todos') {
    sql += ' WHERE categoria = ?';
    values.push(categoria);
  }

  try {
    const [results] = await db.query(sql, values);
    res.json(results);
  } catch (err) {
    console.error('Erro ao buscar produtos por categoria:', err.message);
    res.status(500).json({ error: 'Erro ao buscar produtos por categoria' });
  }
});

// Rota para inserir avaliação
app.post('/avaliacoes', async (req, res) => {
  const { estrelas, comentario, produtoId, usuarioId } = req.body;

  if (!estrelas || !comentario || !produtoId || !usuarioId) {
    return res.status(400).json({ error: 'Dados incompletos.' });
  }

  const sql = `
    INSERT INTO avaliacao (estrelas, comentario, fk_produto_id_produto, fk_usuario_id_usuario, data_avaliacao)
    VALUES (?, ?, ?, ?, NOW())
  `;

  try {
    await db.query(sql, [estrelas, comentario, produtoId, usuarioId]);
    res.json({ message: 'Avaliação salva com sucesso!' });
  } catch (err) {
    console.error('Erro ao salvar avaliação:', err.message);
    res.status(500).json({ error: 'Erro ao salvar avaliação.' });
  }
});

// Rota para buscar avaliações de um produto
app.get('/avaliacoes/:produtoId', async (req, res) => {
  const produtoId = req.params.produtoId;

  const sql = `
    SELECT estrelas, comentario 
    FROM avaliacao 
    WHERE fk_produto_id_produto = ? 
    ORDER BY data_avaliacao DESC
  `;

  try {
    const [results] = await db.query(sql, [produtoId]);
    res.json(results);
  } catch (err) {
    console.error('Erro ao buscar avaliações:', err.message);
    res.status(500).json({ error: 'Erro ao buscar avaliações' });
  }
});


app.delete('/avaliacoes/:id', (req, res) => {
  const id = req.params.id;

  const sql = 'DELETE FROM avaliacao WHERE id_avaliacao = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Erro ao deletar avaliação:', err.message);
      return res.status(500).json({ error: 'Erro ao deletar avaliação' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Avaliação não encontrada.' });
    }

    res.json({ message: 'Avaliação deletada com sucesso.' });
  });
});

app.delete('/avaliacoes/:id', (req, res) => {
  const id = req.params.id;

  const sql = 'DELETE FROM avaliacao WHERE id_avaliacao = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Erro ao deletar avaliação:', err.message);
      return res.status(500).json({ error: 'Erro ao deletar avaliação' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Avaliação não encontrada.' });
    }

    res.json({ message: 'Avaliação deletada com sucesso.' });
  });
});

// Rota de favoritos (já estava com async/await)
app.post('/favoritos', async (req, res) => {
  const { produtoId, usuarioId } = req.body;

  if (!produtoId || !usuarioId) {
    return res.json({ sucesso: false, mensagem: 'Dados incompletos' });
  }

  try {
    const [rows] = await db.query(
      'SELECT * FROM favoritado WHERE fk_produto_id_produto = ? AND fk_usuario_id_usuario = ?',
      [produtoId, usuarioId]
    );

    if (rows.length > 0) {
      await db.query(
        'DELETE FROM favoritado WHERE fk_produto_id_produto = ? AND fk_usuario_id_usuario = ?',
        [produtoId, usuarioId]
      );
      return res.json({ sucesso: true, favorito: false });
    } else {
      await db.query(
        'INSERT INTO favoritado (fk_produto_id_produto, fk_usuario_id_usuario) VALUES (?, ?)',
        [produtoId, usuarioId]
      );
      return res.json({ sucesso: true, favorito: true });
    }
  } catch (error) {
    console.error(error);
    return res.json({ sucesso: false, mensagem: 'Erro no banco de dados' });
  }
});



app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
