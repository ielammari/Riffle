# API blueprint registration.


def register_api(app):
    from backend.auth import bp as auth_bp
    from .cart import bp as cart_bp
    from .categories import bp as categories_bp
    from .deck import bp as deck_bp
    from .parse import bp as parse_bp
    from .products import bp as products_bp
    from .reset import bp as reset_bp
    from .second_thoughts import bp as second_thoughts_bp
    from .settings import bp as settings_bp
    from .swipe import bp as swipe_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(cart_bp)
    app.register_blueprint(categories_bp)
    app.register_blueprint(deck_bp)
    app.register_blueprint(parse_bp)
    app.register_blueprint(products_bp)
    app.register_blueprint(reset_bp)
    app.register_blueprint(second_thoughts_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(swipe_bp)
