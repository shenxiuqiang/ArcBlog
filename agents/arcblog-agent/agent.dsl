agent "arcblog-agent" {
  type ai
  description "Read-only ArcBlog assistant: search and read published stories, taxonomy and node metadata."
  instructions "system.md"
  model "gpt-5.5"
  tool "/instance/app/arcblog/posts/**" ops read,list,stat maxDepth 2
  tool "/instance/app/arcblog/categories/**" ops read,list,stat maxDepth 2
  tool "/instance/app/arcblog/node/**" ops read,list,stat maxDepth 2
  tool "/instance/app/arcblog/economy/policies/**" ops read,list,stat maxDepth 2
  tool "/instance/app/arcblog/economy/products/**" ops read,list,stat maxDepth 2
  budget maxRounds 6 totalTokens 64000
}
