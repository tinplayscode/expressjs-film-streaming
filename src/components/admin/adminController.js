import Category from "../movies/categoryModel";
import Movie from "../movies/movieModel";
import User from "../auth/userModel";
import Season from "../movies/seasonModel";
import Episode from "../movies/episodeModel";
import createError from "http-errors";
import { hashPassword } from "../../utils";

export const getAdmin = async (req, res, next) => {
  try {
    // get user count, category count, movie count
    const [users, categories, movies, admins] = await Promise.all([
      User.countDocuments({ role: "user" }),
      Category.countDocuments(),
      Movie.countDocuments(),
      User.countDocuments({ role: "admin" }),
    ]);

    res.render("admin/views/index", {
      title: "Admin",
      count: { users, categories, movies, admins },
    });
  } catch (error) {
    next(createError(500));
  }
};

export const getAdminPanel = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(5);

  const start = (page - 1) * limit;

  // get admin and paginate
  const admins = await User.find({ role: "admin" }).skip(start).limit(limit);

  // count admins
  const adminCount = await User.countDocuments({ role: "admin" });

  // get total pages
  const totalPages = Math.ceil(adminCount / 5);

  const pagination = Array.from({ length: totalPages }, (_, i) => i + 1).map(
    (page) => {
      return {
        url: `admins?page=${page}`,
        number: page,
      };
    }
  );

  res.render("admin/views/admins", {
    title: "Admin",
    admins,
    adminCount,
    pagination,
    currentIndex: page - 1,
    currentPage: page,
  });
};

export const getUserPanel = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(5);

  const start = (page - 1) * limit;

  // get user and paginate
  const users = await User.find({ role: "user" }).skip(start).limit(limit);

  // count users
  const userCount = await User.countDocuments({ role: "user" });

  // get total pages
  const totalPages = Math.ceil(userCount / 5);

  const pagination = Array.from({ length: totalPages }, (_, i) => i + 1).map(
    (page) => {
      return {
        url: `users?page=${page}`,
        number: page,
      };
    }
  );

  res.render("admin/views/users", {
    title: "Admin",
    users,
    userCount,
    pagination,
    currentIndex: page - 1,
    currentPage: page,
  });
};

// Movie panel
export const moviePanelGetIndex = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const error = req.session?.error;
  const success = req.session?.success;

  // get all movies, sort, and populate all
  const movies = await Movie.find({})
    //.sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate({
      path: "categories",
      model: Category,
    });

  const categories = await Category.find({});

  // get movie count
  const movieCount = await Movie.countDocuments();

  // get total pages
  const totalPages = Math.ceil(movieCount / 10);

  const pagination = Array.from({ length: totalPages }, (_, i) => i + 1).map(
    (page) => {
      return {
        url: `movies?page=${page}`,
        number: page,
      };
    }
  );

  res.render("admin/views/movies", {
    title: "Admin",
    movies,
    movieCount,
    categories,
    pagination,
    currentIndex: page - 1,
    currentPage: page,
  });
};

export const moviePanelGetMovie = async (req, res) => {
  try {
    const movie = await Movie.findOne({ slug: req.params.slug }).populate({
      path: "seasons",
      model: Season,
      populate: {
        path: "episodes",
        model: Episode,
      },
    });

    if (!movie) throw new Error("Movie not found");

    res.render("admin/views/movies", {
      title: "Admin",
      movie,
    });
  } catch (err) {
    res.redirect("/admin/movies");
  }
};

export const moviePanelEditSeason = async (req, res) => {
  try {
    const { slug, seasonSlug } = req.params;

    const { _id: movieId } = await Movie.findOne({ slug });

    const season = await Season.findOne({
      slug: seasonSlug,
      movie: movieId,
    }).populate({
      path: "episodes",
      model: Episode,
    });

    if (!season) throw new Error("Season not found");

    // res.json({ success: true, season });
    res.render("admin/views/season", {
      title: "Admin",
      season,
    });
  } catch (err) {
    res.json({ success: false, err });
  }
};

export const moviePanelEditMovie = async (req, res) => {
  const { slug } = req.params;

  try {
    const movie = await Movie.findOne({ slug }).populate({
      path: "seasons",
      model: Season,
      populate: {
        path: "episodes",
        model: Episode,
      },
    });

    //get all categories
    const categories = await Category.find({});

    if (!movie) throw new Error("Movie not found");

    res.render("admin/views/movie-edit", {
      title: "Admin",
      movie,
      categories,
    });
  } catch (err) {
    req.flash("error", err.message);
    res.redirect("/admin/movies");
  }
};

export const moviePanelPostMovie = async (req, res) => {
  try {
    const movie = await Movie.findOne({ slug: req.params.slug });

    if (!movie) throw new Error("Movie not found");

    const { title, description, year, rating, duration, trailer } = req.body;

    await Movie.findByIdAndUpdate(movie._id, {
      title,
      description,
      year,
      rating,
      duration,
      trailer,
    });

    res.render("admin/views/movies", {
      title: "Admin",
      movie,
      success: "Movie updated successfully",
    });
  } catch (err) {
    res.redirect("/admin/movies");
  }
};

export const getCategoriesPanel = async (req, res) => {
  // get all categories
  const categories = await Category.find({});

  res.render("admin/views/categories", { title: "Admin", categories });
};

export const createAdmin = async (req, res) => {
  try {
    const { username, password, email, fullname, repassword } = req.body;

    if (password !== repassword) {
      throw new Error("Mật khẩu không trùng khớp");
    }

    // check if password is less than 6 characters
    if (password.length < 6) {
      throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
    }

    // check if username is less than 6 characters
    if (username.length < 6) {
      throw new Error("Tên đăng nhập phải có ít nhất 6 ký tự");
    }

    // check if email is valid
    if (!/^[a-zA-Z0-9]+@[a-zA-Z0-9]+\.[A-Za-z]+$/.test(email)) {
      throw new Error("Email không hợp lệ");
    }
    // mongoose add user to database
    const admin = await User.create({
      username,
      password: await hashPassword(password),
      email,
      fullname,
      role: "admin",
    });
    req.flash("success", "Tạo thành công");
    res.redirect("/admin/admins");
  } catch (err) {
    req.flash("error", err.message);
    res.redirect("/admin/");
  }
};

export const makeAdmin = async (req, res) => {
  try {
    const { username } = req.body;

    const user = await User.findOne({ username });
    await User.findByIdAndUpdate(user._id, {
      role: "admin",
    });
    res.json({ success: true, message: "Chuyển " + username + " thành admin thành công !",user });
  } catch (err) {
    req.json({ success: false, err });
  }
};

export const banUser = async (req, res) => {
  try {
    const { username, isBan } = req.body;

    const user = await User.findOne({ username });
    await User.findByIdAndUpdate(user._id, {
      banned: isBan,
    });
    if (isBan === "true") {
      res.json({ success: true, message: "Ban " + username + " thành công", user, isBan });
    } else {
      res.json({ success: true, message: "Unban " + username + " thành công", user, isBan });
    }
  } catch (err) {
    res.json({ success: false, err });
  }
};

export const infoUser = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username });

    if (!user) throw new Error("User not found");

    res.render("admin/views/info-user", {
      title: `${user.username} | Trang cá nhân`,
      user,
    });
  } catch (err) {
    req.flash("error", err.message);
    res.redirect("/admin/users");
  }
};

export const makeUser = async (req, res) => {
  try {
    const { username } = req.body;

    const user = await User.findOne({ username });
    await User.findByIdAndUpdate(user._id, {
      role: "user",
    });
    res.json({ success: true, message: "Chuyển " + username + " thành user thành công !", user });
  } catch (err) {
    req.json({ success: false, err });
  }
}
