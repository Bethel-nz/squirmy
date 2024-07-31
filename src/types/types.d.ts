// Generated types start
type User = {
      id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
      relations: {
    posts: { type: 'hasMany'; model: 'Post'; foreignKey: 'userid'; };
    profile: { type: 'hasOne'; model: 'Profile'; foreignKey: 'userid'; };
    roles: { type: 'manyToMany'; model: 'Role'; foreignKey: 'userid'; };
  }
    };

type Post = {
      id: string;
  title: string;
  content: string;
  userid: string;
  createdAt: Date;
  updatedAt: Date;
      relations: {
    author: { type: 'belongsTo'; model: 'User'; foreignKey: 'userid'; };
    comments: { type: 'hasMany'; model: 'Comment'; foreignKey: 'postId'; };
    tags: { type: 'manyToMany'; model: 'Tag'; foreignKey: 'postId'; };
  }
    };

type Profile = {
      id: string;
  userid: string;
  bio: string;
  avatarUrl: string;
      relations: {
    user: { type: 'belongsTo'; model: 'User'; foreignKey: 'userid'; };
  }
    };

type Role = {
      id: string;
  name: string;
      relations: {
    users: { type: 'manyToMany'; model: 'User'; foreignKey: 'roleId'; };
  }
    };

type Comment = {
      id: string;
  content: string;
  postId: string;
  userid: string;
  createdAt: Date;
  updatedAt: Date;
      relations: {
    post: { type: 'belongsTo'; model: 'Post'; foreignKey: 'postId'; };
    author: { type: 'belongsTo'; model: 'User'; foreignKey: 'userid'; };
  }
    };

type Tag = {
      id: string;
  name: string;
      relations: {
    posts: { type: 'manyToMany'; model: 'Post'; foreignKey: 'tagId'; };
  }
    };

type UserRoles = {
      userid: string;
  roleId: string;
      relations: {
    user: { type: 'belongsTo'; model: 'User'; foreignKey: 'userid'; };
    role: { type: 'belongsTo'; model: 'Role'; foreignKey: 'roleId'; };
  }
    };

type PostTags = {
      postId: string;
  tagId: string;
      relations: {
    post: { type: 'belongsTo'; model: 'Post'; foreignKey: 'postId'; };
    tag: { type: 'belongsTo'; model: 'Tag'; foreignKey: 'tagId'; };
  }
    };

type ModelTypes = {
    User: User;
  Post: Post;
  Profile: Profile;
  Role: Role;
  Comment: Comment;
  Tag: Tag;
  UserRoles: UserRoles;
  PostTags: PostTags;
  };
// Generated types end
