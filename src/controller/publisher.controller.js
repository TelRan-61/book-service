import {Author, Book} from "../model/index.js";

export const findPublishersByAuthor = async (req, res) => {
    const author = await Author.findByPk(req.params.name);
    if (!author) {
        return res.status(404).json({error: 'Author not found'});
    }
    const publishers = await Book.aggregate('publisher', 'DISTINCT', {
        plain: false,
        include: {
            model: Author,
            as: 'authors',
            where: {name: author.name},
            through: {attributes: []}
        }
    })
    return res.json(publishers.map(p => p.DISTINCT));
}