import {Author, Book, Publisher} from "../model/index.js";
import {sequelize} from "../config/database.js";

export const addBook = async (req, res) => {
    const t = await sequelize.transaction({readOnly: true});
    try {
        const {isbn, title, authors, publisher} = req.body;
        const existingBook = await Book.findByPk(isbn);
        if (existingBook) {
            await t.rollback();
            return res.status(409).send({
                error: `Book with ISBN ${isbn} already exists`
            });
        }
        // Create or find the publisher
        if (!await Publisher.findByPk(publisher, {transaction: t})) {
            await Publisher.create({publisher_name: publisher}, {transaction: t});
        }
        // Process the authors
        const authorRecords = [];
        for (const author of authors) {
            let authorRecord = await Author.findByPk(author.name, {transaction: t});
            if (!authorRecord) {
                authorRecord = await Author.create({
                    name: author.name,
                    birth_date: new Date(author.birthDate)
                }, {transaction: t});
            }
            if (authorRecords.findIndex(a => a.name === authorRecord.name) === -1) {
                authorRecords.push(authorRecord);
            }
        }
        // Create a new book
        const book = await Book.create({isbn, title, publisher}, {transaction: t});
        await book.setAuthors(authorRecords, {transaction: t});
        await t.commit();
        return res.status(201).send();
    } catch (e) {
        await t.rollback();
        console.error('Error adding book:', e);
        return res.status(500).send({
            error: e.message,
            message: 'Failed to add book'
        });
    }
}

export const findBookByIsbn = async (req, res) => {
    const book = await Book.findByPk(req.params.isbn);
    if (book) {
        const result = {
            isbn: book.isbn,
            title: book.title,
            publisher: book.publisher,
            authors: (await book.getAuthors()).map(a => ({
                name: a.dataValues.name,
                birthDate: a.dataValues.birth_date
            }))
        }
        return res.json(result);
    } else {
        return res.status(404).send({error: `Book with ISBN ${req.params.isbn} not found`});
    }
}